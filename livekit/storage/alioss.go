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
	"fmt"
	"io"
	"os"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

type aliOSSStorage struct {
	conf   *AliOSSConfig
	bucket *oss.Bucket
}

func NewAliOSS(conf *AliOSSConfig) (Storage, error) {
	client, err := oss.New(conf.Endpoint, conf.AccessKey, conf.Secret)
	if err != nil {
		return nil, err
	}

	bucket, err := client.Bucket(conf.Bucket)
	if err != nil {
		return nil, err
	}

	return &aliOSSStorage{
		conf:   conf,
		bucket: bucket,
	}, nil
}

func (s *aliOSSStorage) UploadData(data []byte, storagePath, _ string) (string, int64, error) {
	reader := bytes.NewBuffer(data)
	if err := s.bucket.PutObject(storagePath, reader); err != nil {
		return "", 0, err
	}

	return fmt.Sprintf("https://%s.%s/%s", s.conf.Bucket, s.conf.Endpoint, storagePath), int64(len(data)), nil
}

func (s *aliOSSStorage) UploadFile(filepath, storagePath, _ string) (string, int64, error) {
	info, err := os.Stat(filepath)
	if err != nil {
		return "", 0, err
	}

	if err = s.bucket.PutObjectFromFile(storagePath, filepath); err != nil {
		return "", 0, err
	}

	return fmt.Sprintf("https://%s.%s/%s", s.conf.Bucket, s.conf.Endpoint, storagePath), info.Size(), nil
}

func (s *aliOSSStorage) DownloadData(storagePath string) ([]byte, error) {
	reader, err := s.bucket.GetObject(storagePath)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	return io.ReadAll(reader)
}

func (s *aliOSSStorage) DownloadFile(filepath, storagePath string) (int64, error) {
	if err := s.bucket.GetObjectToFile(storagePath, filepath); err != nil {
		return 0, err
	}

	info, err := os.Stat(filepath)
	if err != nil {
		return 0, err
	}

	return info.Size(), nil
}

func (s *aliOSSStorage) GeneratePresignedUrl(storagePath string) (string, error) {
	return s.bucket.SignURL(storagePath, oss.HTTPGet, 7*24*60*60)
}

func (s *aliOSSStorage) Delete(storagePath string) error {
	return s.bucket.DeleteObject(storagePath)
}
