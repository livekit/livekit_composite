// Copyright 2024 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package storage

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/aws/retry"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/credentials/stscreds"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/aws/smithy-go/middleware"
	smithyhttp "github.com/aws/smithy-go/transport/http"
)

const defaultBucketLocation = "us-east-1"

type s3Storage struct {
	conf    *S3Config
	awsConf *aws.Config
}

func NewS3(conf *S3Config) (Storage, error) {
	var cp aws.CredentialsProvider

	if conf.AccessKey != "" && conf.Secret != "" {
		cp = credentials.StaticCredentialsProvider{
			Value: aws.Credentials{
				AccessKeyID:     conf.AccessKey,
				SecretAccessKey: conf.Secret,
				SessionToken:    conf.SessionToken,
			},
		}
	}

	awsConf, err := getConf(conf, cp)
	if err != nil {
		return nil, err
	}

	if conf.AssumeRoleArn != "" {
		stsSvc := sts.NewFromConfig(*awsConf)
		cp = stscreds.NewAssumeRoleProvider(stsSvc, conf.AssumeRoleArn, func(o *stscreds.AssumeRoleOptions) {
			if conf.AssumeRoleExternalId != "" {
				o.ExternalID = aws.String(conf.AssumeRoleExternalId)
			}
		})
		awsConf, err = getConf(conf, cp)
		if err != nil {
			return nil, err
		}
	}

	if conf.Region == "" && conf.Endpoint == "" {
		if err = updateRegion(awsConf, conf.Bucket); err != nil {
			return nil, err
		}
	}

	return &s3Storage{
		conf:    conf,
		awsConf: awsConf,
	}, nil
}

func getConf(conf *S3Config, cp aws.CredentialsProvider) (*aws.Config, error) {
	opts := func(o *config.LoadOptions) error {
		if conf.Region != "" {
			o.Region = conf.Region
		} else {
			o.Region = defaultBucketLocation
		}

		o.Credentials = cp
		o.Retryer = func() aws.Retryer {
			return retry.NewStandard(func(o *retry.StandardOptions) {
				o.MaxAttempts = conf.MaxRetries
				o.MaxBackoff = conf.MaxRetryDelay
			})
		}

		if conf.ProxyConfig != nil {
			proxyUrl, err := url.Parse(conf.ProxyConfig.Url)
			if err != nil {
				return err
			}
			s3Transport := http.DefaultTransport.(*http.Transport).Clone()
			s3Transport.Proxy = http.ProxyURL(proxyUrl)
			if conf.ProxyConfig.Username != "" && conf.ProxyConfig.Password != "" {
				auth := fmt.Sprintf("%s:%s", conf.ProxyConfig.Username, conf.ProxyConfig.Password)
				basicAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))
				s3Transport.ProxyConnectHeader = http.Header{}
				s3Transport.ProxyConnectHeader.Add("Proxy-Authorization", basicAuth)
			}
			o.HTTPClient = &http.Client{Transport: s3Transport}
		}

		return nil
	}

	awsConf, err := config.LoadDefaultConfig(context.Background(), opts)
	if err != nil {
		return nil, err
	}

	if conf.Endpoint != "" {
		awsConf.BaseEndpoint = &conf.Endpoint
	}

	return &awsConf, nil
}

func updateRegion(awsConf *aws.Config, bucket string) error {
	req := &s3.GetBucketLocationInput{
		Bucket: &bucket,
	}

	resp, err := s3.NewFromConfig(*awsConf).GetBucketLocation(context.Background(), req)
	if err != nil {
		return err
	}

	if resp.LocationConstraint != "" {
		awsConf.Region = string(resp.LocationConstraint)
	}

	return nil
}

func (s *s3Storage) UploadData(data []byte, storagePath, contentType string) (string, int64, error) {
	location, err := s.upload(bytes.NewReader(data), storagePath, contentType)
	if err != nil {
		return "", 0, err
	}
	return location, int64(len(data)), nil
}

func (s *s3Storage) UploadFile(filepath, storagePath, contentType string) (string, int64, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return "", 0, err
	}
	defer func() {
		_ = file.Close()
	}()

	stat, err := file.Stat()
	if err != nil {
		return "", 0, err
	}

	location, err := s.upload(file, storagePath, contentType)
	if err != nil {
		return "", 0, err
	}

	return location, stat.Size(), nil
}

func (s *s3Storage) upload(reader io.Reader, storagePath, contentType string) (string, error) {
	l := NewS3Logger()
	client := s3.NewFromConfig(*s.awsConf, func(o *s3.Options) {
		o.Logger = l
		o.ClientLogMode = aws.LogRequest | aws.LogResponse | aws.LogRetries
		o.UsePathStyle = s.conf.ForcePathStyle

		// switch to md5 checksum for oracle cloud
		if s.conf.Endpoint != "" {
			if parsed, err := url.Parse(s.conf.Endpoint); err == nil && strings.HasSuffix(parsed.Host, "oraclecloud.com") {
				o.APIOptions = append(o.APIOptions, func(stack *middleware.Stack) error {
					stack.Initialize.Remove("AWSChecksum:SetupInputContext")
					stack.Build.Remove("AWSChecksum:RequestMetricsTracking")
					stack.Finalize.Remove("AWSChecksum:ComputeInputPayloadChecksum")
					stack.Finalize.Remove("addInputChecksumTrailer")
					return smithyhttp.AddContentChecksumMiddleware(stack)
				})
			}
		}
	})

	input := &s3.PutObjectInput{
		Body:        reader,
		Bucket:      aws.String(s.conf.Bucket),
		ContentType: aws.String(contentType),
		Key:         aws.String(storagePath),
		Metadata:    s.conf.Metadata,
	}
	if s.conf.Tagging != "" {
		input.Tagging = &s.conf.Tagging
	}
	if s.conf.ContentDisposition != "" {
		input.ContentDisposition = &s.conf.ContentDisposition
	} else {
		contentDisposition := "inline"
		input.ContentDisposition = &contentDisposition
	}

	if _, err := manager.NewUploader(client).Upload(context.Background(), input); err != nil {
		return "", err
	}

	endpoint := "s3.amazonaws.com"
	if s.conf.Endpoint != "" {
		endpoint = s.conf.Endpoint
	}

	var location string
	if s.conf.ForcePathStyle {
		if !strings.HasPrefix(endpoint, "http") {
			endpoint = "https://" + endpoint
		}
		location = fmt.Sprintf("%s/%s/%s", endpoint, s.conf.Bucket, storagePath)
	} else {
		location = fmt.Sprintf("https://%s.%s/%s", s.conf.Bucket, endpoint, storagePath)
	}

	return location, nil
}

func (s *s3Storage) ListObjects(prefix string) ([]string, error) {
	client := s3.NewFromConfig(*s.awsConf, func(o *s3.Options) {
		o.UsePathStyle = s.conf.ForcePathStyle
	})

	var objects []string
	paginator := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
		Bucket: aws.String(s.conf.Bucket),
		Prefix: aws.String(prefix),
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(context.Background())
		if err != nil {
			return nil, err
		}

		for _, obj := range page.Contents {
			objects = append(objects, *obj.Key)
		}
	}

	return objects, nil
}

func (s *s3Storage) DownloadData(storagePath string) ([]byte, error) {
	w := &manager.WriteAtBuffer{}
	_, err := s.download(w, storagePath)
	if err != nil {
		return nil, err
	}

	return w.Bytes(), nil
}

func (s *s3Storage) DownloadFile(filepath, storagePath string) (int64, error) {
	file, err := os.Create(filepath)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	return s.download(file, storagePath)
}

func (s *s3Storage) download(w io.WriterAt, storagePath string) (int64, error) {
	client := s3.NewFromConfig(*s.awsConf)
	return manager.NewDownloader(client).Download(
		context.Background(),
		w,
		&s3.GetObjectInput{
			Bucket: aws.String(s.conf.Bucket),
			Key:    aws.String(storagePath),
		},
	)
}

func (s *s3Storage) GeneratePresignedUrl(storagePath string, expiration time.Duration) (string, error) {
	client := s3.NewFromConfig(*s.awsConf, func(o *s3.Options) {
		o.UsePathStyle = s.conf.ForcePathStyle
	})

	res, err := s3.NewPresignClient(client).PresignGetObject(context.Background(), &s3.GetObjectInput{
		Bucket: aws.String(s.conf.Bucket),
		Key:    aws.String(storagePath),
	}, s3.WithPresignExpires(expiration))
	if err != nil {
		return "", err
	}

	return res.URL, nil
}

func (s *s3Storage) Delete(storagePath string) error {
	client := s3.NewFromConfig(*s.awsConf)
	_, err := client.DeleteObject(context.Background(), &s3.DeleteObjectInput{
		Bucket: aws.String(s.conf.Bucket),
		Key:    aws.String(storagePath),
	})
	return err
}
