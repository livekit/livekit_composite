package storage_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/livekit/storage"
)

func TestStorage(t *testing.T) {
	names := []string{"aliOSS", "azure", "gcp", "s3"}
	for i, s := range []storage.Storage{
		getAliOSS(t),
		getAzure(t),
		getGCP(t),
		getS3(t),
	} {
		if s != nil {
			t.Run(names[i], func(t *testing.T) {
				testStorage(t, s)
			})
		}
	}
}

func testStorage(t *testing.T, s storage.Storage) {
	filename := fmt.Sprintf("test-%s.txt", time.Now().Format("01-02-15-04"))
	data := []byte("hello world")

	// upload
	url, size, err := s.UploadData(data, filename, "text/plain")
	require.NoError(t, err)
	require.Equal(t, int64(len(data)), size)
	require.NotEmpty(t, url)

	// download
	downloaded, err := s.DownloadData(filename)
	require.NoError(t, err)
	require.Equal(t, data, downloaded)

	// delete
	err = s.Delete(filename)
	require.NoError(t, err)
}

func getAliOSS(t *testing.T) storage.Storage {
	key := os.Getenv("ALI_ACCESS_KEY")
	if key == "" {
		return nil
	}
	s, err := storage.NewAliOSS(&storage.AliOSSConfig{
		AccessKey: key,
		Secret:    os.Getenv("ALI_SECRET"),
		Endpoint:  os.Getenv("ALI_ENDPOINT"),
		Bucket:    os.Getenv("ALI_BUCKET"),
	})
	require.NoError(t, err)
	return s
}

func getAzure(t *testing.T) storage.Storage {
	key := os.Getenv("AZURE_ACCOUNT_NAME")
	if key == "" {
		return nil
	}
	s, err := storage.NewAzure(&storage.AzureConfig{
		AccountName:   key,
		AccountKey:    os.Getenv("AZURE_ACCOUNT_KEY"),
		ContainerName: os.Getenv("AZURE_CONTAINER_NAME"),
	})
	require.NoError(t, err)
	return s
}

func getGCP(t *testing.T) storage.Storage {
	key := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if key == "" {
		return nil
	}
	s, err := storage.NewGCP(&storage.GCPConfig{
		CredentialsJSON: key,
		Bucket:          os.Getenv("GCP_BUCKET"),
	})
	require.NoError(t, err)
	return s
}

func getS3(t *testing.T) storage.Storage {
	key := os.Getenv("AWS_ACCESS_KEY")
	if key == "" {
		return nil
	}
	s, err := storage.NewS3(&storage.S3Config{
		AccessKey: key,
		Secret:    os.Getenv("AWS_SECRET"),
		Region:    os.Getenv("AWS_REGION"),
		Bucket:    os.Getenv("S3_BUCKET"),
	})
	require.NoError(t, err)
	return s
}
