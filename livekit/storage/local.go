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
	"strings"
	"time"
)

type localUploader struct {
	StorageDir string
}

func NewLocal(conf *LocalConfig) (Storage, error) {
	dir, err := filepath.Abs(conf.StorageDir)
	if err != nil {
		return nil, err
	}

	return &localUploader{
		StorageDir: dir,
	}, nil
}

func (u *localUploader) UploadFile(localPath, storagePath string, _ string) (string, int64, error) {
	storagePath = path.Join(u.StorageDir, storagePath)

	local, err := os.Open(localPath)
	if err != nil {
		return "", 0, err
	}
	defer local.Close()

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
	storagePath = path.Join(u.StorageDir, storagePath)

	if dir, _ := path.Split(storagePath); dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
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
	absPrefix := path.Join(u.StorageDir, prefix)
	dir, filenamePrefix := path.Split(absPrefix)

	var files []string
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, nil
	}

	for _, entry := range entries {
		if !strings.HasPrefix(entry.Name(), filenamePrefix) {
			continue
		}

		entryPath := path.Join(dir, entry.Name())
		if entry.IsDir() {
			if err = filepath.Walk(entryPath, func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return err
				}
				if !info.IsDir() {
					files = append(files, path)
				}
				return nil
			}); err != nil {
				return nil, err
			}
		} else {
			files = append(files, entryPath)
		}
	}

	return files, nil
}

func (u *localUploader) DownloadData(storagePath string) ([]byte, error) {
	return os.ReadFile(path.Join(u.StorageDir, storagePath))
}

func (u *localUploader) DownloadFile(localPath, storagePath string) (int64, error) {
	storagePath = path.Join(u.StorageDir, storagePath)

	local, err := os.Open(localPath)
	if err != nil {
		return 0, err
	}
	defer local.Close()

	if dir, _ := path.Split(storagePath); dir != "" {
		if err = os.MkdirAll(dir, 0755); err != nil {
			return 0, err
		}
	}

	storage, err := os.Create(storagePath)
	if err != nil {
		return 0, err
	}
	defer storage.Close()

	size, err := io.Copy(local, storage)
	if err != nil {
		return 0, err
	}

	return size, nil
}

func (u *localUploader) GeneratePresignedUrl(storagePath string, _ time.Duration) (string, error) {
	return fmt.Sprintf("file://%s", path.Join(u.StorageDir, storagePath)), nil
}

func (u *localUploader) DeleteObject(storagePath string) error {
	storagePath = path.Join(u.StorageDir, storagePath)

	for {
		if err := os.Remove(storagePath); err != nil {
			return err
		}

		storagePath, _ = path.Split(storagePath)
		storagePath = storagePath[:len(storagePath)-1] // remove trailing slash
		entries, err := os.ReadDir(storagePath)
		if err != nil {
			return err
		}

		if storagePath == u.StorageDir || len(entries) > 0 {
			return nil
		}
	}
}

func (u *localUploader) DeleteObjects(storagePaths []string) error {
	for _, p := range storagePaths {
		if err := u.DeleteObject(p); err != nil {
			return err
		}
	}
	return nil
}
