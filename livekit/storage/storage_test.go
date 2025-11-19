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

package storage_test

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"github.com/stretchr/testify/require"

	"github.com/livekit/storage"
)

func TestAliOSS(t *testing.T) {
	key := os.Getenv("ALI_ACCESS_KEY")
	secret := os.Getenv("ALI_SECRET")
	endpoint := os.Getenv("ALI_ENDPOINT")
	bucket := os.Getenv("ALI_BUCKET")

	if key == "" || secret == "" || endpoint == "" || bucket == "" {
		t.Skip("Missing env vars")
	}

	s, err := storage.NewAliOSS(&storage.AliOSSConfig{
		AccessKey: key,
		Secret:    secret,
		Endpoint:  endpoint,
		Bucket:    bucket,
	})
	require.NoError(t, err)

	testStorage(t, s)
}

func TestAzure(t *testing.T) {
	name := os.Getenv("AZURE_ACCOUNT_NAME")
	key := os.Getenv("AZURE_ACCOUNT_KEY")
	container := os.Getenv("AZURE_CONTAINER_NAME")

	if name == "" || key == "" || container == "" {
		t.Skip("Missing env vars")
	}

	s, err := storage.NewAzure(&storage.AzureConfig{
		AccountName:   name,
		AccountKey:    key,
		ContainerName: container,
	})
	require.NoError(t, err)

	testStorage(t, s)
}

func TestGCP(t *testing.T) {
	creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	bucket := os.Getenv("GCP_BUCKET")

	if creds == "" || bucket == "" {
		t.Skip("Missing env vars")
	}

	s, err := storage.NewGCP(&storage.GCPConfig{
		CredentialsJSON: creds,
		Bucket:          bucket,
	})
	require.NoError(t, err)

	testStorage(t, s)
}

func TestLocal(t *testing.T) {
	s, err := storage.NewLocal(&storage.LocalConfig{})
	require.NoError(t, err)

	testStorage(t, s)
}

func TestOCI(t *testing.T) {
	key := os.Getenv("OCI_ACCESS_KEY")
	secret := os.Getenv("OCI_SECRET")
	region := os.Getenv("OCI_REGION")
	endpoint := os.Getenv("OCI_ENDPOINT")
	bucket := os.Getenv("OCI_BUCKET")

	if key == "" || secret == "" || region == "" || endpoint == "" || bucket == "" {
		t.Skip("Missing env vars")
	}

	s, err := storage.NewS3(&storage.S3Config{
		AccessKey:      key,
		Secret:         secret,
		Region:         region,
		Endpoint:       endpoint,
		Bucket:         bucket,
		ForcePathStyle: true,
	})
	require.NoError(t, err)

	testStorage(t, s)
}

func TestSupabase(t *testing.T) {
	key := os.Getenv("SUPABASE_ACCESS_KEY")
	secret := os.Getenv("SUPABASE_SECRET")
	region := os.Getenv("SUPABASE_REGION")
	endpoint := os.Getenv("SUPABASE_ENDPOINT")
	bucket := os.Getenv("SUPABASE_BUCKET")

	if key == "" || secret == "" || region == "" || endpoint == "" || bucket == "" {
		t.Skip("Missing env vars")
	}

	s, err := storage.NewS3(&storage.S3Config{
		AccessKey:      key,
		Secret:         secret,
		Region:         region,
		Endpoint:       endpoint,
		Bucket:         bucket,
		ForcePathStyle: true,
	})
	require.NoError(t, err)

	testStorage(t, s)
}

func TestS3(t *testing.T) {
	key := os.Getenv("AWS_ACCESS_KEY")
	secret := os.Getenv("AWS_SECRET")
	bucket := os.Getenv("S3_BUCKET")

	if key == "" || secret == "" || bucket == "" {
		t.Skip("Missing env vars")
	}

	s, err := storage.NewS3(&storage.S3Config{
		AccessKey:    key,
		Secret:       secret,
		SessionToken: os.Getenv("AWS_SESSION_TOKEN"),
		Region:       os.Getenv("AWS_REGION"),
		Bucket:       bucket,
	})
	require.NoError(t, err)

	testStorage(t, s)
}

func testStorage(t *testing.T, s storage.Storage) {
	storagePath := fmt.Sprintf("test-%s.txt", time.Now().Format("01-02-15-04"))
	data := []byte("hello world")

	// upload
	url, size, err := s.UploadData(data, storagePath, "text/plain")
	require.NoError(t, err)
	require.Equal(t, int64(len(data)), size)
	require.NotEmpty(t, url)

	// list
	items, err := s.ListObjects("test")
	require.NoError(t, err)
	require.Len(t, items, 1)
	require.True(t, strings.HasSuffix(items[0], storagePath))

	// download
	downloaded, err := s.DownloadData(storagePath)
	require.NoError(t, err)
	require.Equal(t, data, downloaded)

	// delete
	err = s.DeleteObject(storagePath)
	require.NoError(t, err)
}
