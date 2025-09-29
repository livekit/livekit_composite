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
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"cloud.google.com/go/storage"
	"github.com/googleapis/gax-go/v2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

const storageScope = "https://www.googleapis.com/auth/devstorage.read_write"

type gcpStorage struct {
	conf   *GCPConfig
	client *storage.Client
}

func NewGCP(conf *GCPConfig) (Storage, error) {
	u := &gcpStorage{
		conf: conf,
	}

	var opts []option.ClientOption
	if conf.CredentialsJSON != "" {
		jwtConfig, err := google.JWTConfigFromJSON([]byte(conf.CredentialsJSON), storageScope)
		if err != nil {
			return nil, err
		}
		opts = append(opts, option.WithTokenSource(jwtConfig.TokenSource(context.Background())))
	}

	defaultTransport := http.DefaultTransport.(*http.Transport)
	transportClone := defaultTransport.Clone()

	if conf.ProxyConfig != nil {
		proxyUrl, err := url.Parse(conf.ProxyConfig.Url)
		if err != nil {
			return nil, err
		}
		defaultTransport.Proxy = http.ProxyURL(proxyUrl)
		if conf.ProxyConfig.Username != "" && conf.ProxyConfig.Password != "" {
			auth := fmt.Sprintf("%s:%s", conf.ProxyConfig.Username, conf.ProxyConfig.Password)
			basicAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))
			defaultTransport.ProxyConnectHeader = http.Header{}
			defaultTransport.ProxyConnectHeader.Add("Proxy-Authorization", basicAuth)
		}
	}
	client, err := storage.NewClient(context.Background(), opts...)

	// restore default transport
	http.DefaultTransport = transportClone
	if err != nil {
		return nil, err
	}

	u.client = client
	return u, nil
}

func (s *gcpStorage) UploadData(data []byte, storagePath, contentType string) (string, int64, error) {
	return s.upload(bytes.NewReader(data), storagePath, contentType)
}

func (s *gcpStorage) UploadFile(filepath, storagePath, contentType string) (string, int64, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return "", 0, err
	}
	defer file.Close()

	return s.upload(file, storagePath, contentType)
}

func (s *gcpStorage) upload(reader io.Reader, storagePath, _ string) (string, int64, error) {
	wc := s.client.Bucket(s.conf.Bucket).Object(storagePath).Retryer(
		storage.WithBackoff(gax.Backoff{
			Initial:    time.Millisecond * 100,
			Max:        time.Second * 5,
			Multiplier: 2,
		}),
		storage.WithMaxAttempts(5),
		storage.WithPolicy(storage.RetryAlways),
	).NewWriter(context.Background())
	wc.ChunkRetryDeadline = 0

	n, err := io.Copy(wc, reader)
	if err != nil {
		return "", 0, err
	}

	if err = wc.Close(); err != nil {
		return "", 0, err
	}

	return fmt.Sprintf("https://%s.storage.googleapis.com/%s", s.conf.Bucket, storagePath), n, nil
}

func (s *gcpStorage) ListObjects(prefix string) ([]string, error) {
	it := s.client.Bucket(s.conf.Bucket).Objects(context.Background(), &storage.Query{
		Prefix: prefix,
	})

	var objects []string
	for {
		attr, err := it.Next()
		if err != nil {
			if errors.Is(err, iterator.Done) {
				return objects, nil
			}
			return nil, err
		}
		objects = append(objects, attr.Name)
	}
}

func (s *gcpStorage) DownloadData(storagePath string) ([]byte, error) {
	rc, err := s.download(storagePath)
	if err != nil {
		return nil, err
	}

	b := make([]byte, rc.Attrs.Size)
	_, err = rc.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (s *gcpStorage) DownloadFile(filepath, storagePath string) (int64, error) {
	file, err := os.Create(filepath)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	rc, err := s.download(storagePath)
	if err != nil {
		return 0, err
	}

	_, err = io.Copy(file, rc)
	_ = rc.Close()
	if err != nil {
		return 0, err
	}

	return rc.Attrs.Size, nil
}

func (s *gcpStorage) download(storagePath string) (*storage.Reader, error) {
	ctx := context.Background()
	var client *storage.Client

	var err error
	if s.conf.CredentialsJSON != "" {
		client, err = storage.NewClient(ctx, option.WithCredentialsJSON([]byte(s.conf.CredentialsJSON)))
	} else {
		client, err = storage.NewClient(ctx)
	}
	if err != nil {
		return nil, err
	}
	defer client.Close()

	return client.Bucket(s.conf.Bucket).Object(storagePath).Retryer(
		storage.WithBackoff(
			gax.Backoff{
				Initial:    time.Millisecond * 100,
				Max:        time.Second * 5,
				Multiplier: 2,
			}),
		storage.WithPolicy(storage.RetryAlways),
	).NewReader(ctx)
}

func (s *gcpStorage) GeneratePresignedUrl(storagePath string, expiration time.Duration) (string, error) {
	return s.client.Bucket(s.conf.Bucket).SignedURL(storagePath, &storage.SignedURLOptions{
		Method:  "GET",
		Expires: time.Now().Add(expiration),
	})
}

func (s *gcpStorage) Delete(storagePath string) error {
	return s.client.Bucket(s.conf.Bucket).Object(storagePath).Delete(context.Background())
}
