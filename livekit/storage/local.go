// Copyright 2025 LiveKit, Inc.
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
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"time"
)

type localUploader struct {
}

func NewLocal() Storage {
	return &localUploader{}
}

func (u *localUploader) UploadFile(localPath, storagePath string, _ string) (string, int64, error) {
	local, err := os.Open(localPath)
	if err != nil {
		return "", 0, err
	}
	defer local.Close()

	storagePath, err = filepath.Abs(storagePath)
	if err != nil {
		return "", 0, err
	}
	if dir, _ := path.Split(storagePath); dir != "" {
		if err = os.MkdirAll(dir, 0755); err != nil {
			return "", 0, err
		}
	}

	storage, err := os.Create(storagePath)
	if err != nil {
		return "", 0, err
	}
	defer storage.Close()

	size, err := io.Copy(storage, local)
	if err != nil {
		return "", 0, err
	}

	return storagePath, size, nil
}

func (u *localUploader) UploadData(data []byte, storagePath, _ string) (string, int64, error) {
	storagePath, err := filepath.Abs(storagePath)
	if err != nil {
		return "", 0, err
	}
	if dir, _ := path.Split(storagePath); dir != "" {
		if err = os.MkdirAll(dir, 0755); err != nil {
			return "", 0, err
		}
	}

	storage, err := os.Create(storagePath)
	if err != nil {
		return "", 0, err
	}
	defer storage.Close()

	size, err := storage.Write(data)
	if err != nil {
		return "", 0, err
	}

	return storagePath, int64(size), nil
}

func (u *localUploader) ListObjects(prefix string) ([]string, error) {
	absPrefix, err := filepath.Abs(prefix)
	if err != nil {
		return nil, err
	}

	var files []string
	err = filepath.Walk(absPrefix, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

func (u *localUploader) DownloadData(storagePath string) ([]byte, error) {
	return os.ReadFile(storagePath)
}

func (u *localUploader) DownloadFile(localPath, storagePath string) (int64, error) {
	_, size, err := u.UploadFile(storagePath, localPath, "")
	return size, err
}

func (u *localUploader) GeneratePresignedUrl(storagePath string, _ time.Duration) (string, error) {
	abs, err := filepath.Abs(storagePath)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("file://%s", abs), nil
}

func (u *localUploader) Delete(storagePath string) error {
	return os.Remove(storagePath)
}
