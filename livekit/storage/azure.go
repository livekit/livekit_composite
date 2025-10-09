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
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"time"

	"github.com/Azure/azure-storage-blob-go/azblob"
)

type azureBLOBStorage struct {
	conf         *AzureConfig
	container    string
	containerUrl azblob.ContainerURL
	serviceUrl   azblob.ServiceURL
}

func NewAzure(conf *AzureConfig) (Storage, error) {
	credential, err := azblob.NewSharedKeyCredential(
		conf.AccountName,
		conf.AccountKey,
	)
	if err != nil {
		return nil, err
	}

	pipeline := azblob.NewPipeline(credential, azblob.PipelineOptions{
		Retry: azblob.RetryOptions{
			Policy:        azblob.RetryPolicyExponential,
			MaxTries:      5,
			MaxRetryDelay: time.Second * 5,
		},
	})

	sUrl := fmt.Sprintf("https://%s.blob.core.windows.net", conf.AccountName)
	serviceUrl, err := url.Parse(sUrl)
	if err != nil {
		return nil, err
	}

	cUrl := fmt.Sprintf("%s/%s", sUrl, conf.ContainerName)
	containerUrl, err := url.Parse(cUrl)
	if err != nil {
		return nil, err
	}

	return &azureBLOBStorage{
		conf:         conf,
		container:    sUrl,
		serviceUrl:   azblob.NewServiceURL(*serviceUrl, pipeline),
		containerUrl: azblob.NewContainerURL(*containerUrl, pipeline),
	}, nil
}

func (s *azureBLOBStorage) UploadData(data []byte, storagePath, contentType string) (string, int64, error) {
	blobUrl := s.containerUrl.NewBlockBlobURL(storagePath)
	_, err := azblob.UploadBufferToBlockBlob(context.Background(), data, blobUrl, azblob.UploadToBlockBlobOptions{
		BlobHTTPHeaders: azblob.BlobHTTPHeaders{ContentType: contentType},
		BlockSize:       4 * 1024 * 1024,
		Parallelism:     16,
	})
	if err != nil {
		return "", 0, err
	}

	return fmt.Sprintf("%s/%s", s.container, storagePath), int64(len(data)), nil
}

func (s *azureBLOBStorage) UploadFile(filepath, storagePath, contentType string) (string, int64, error) {
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

	// upload blocks in parallel for optimal performance
	// it calls PutBlock/PutBlockList for files larger than 256 MBs and PutBlob for smaller files
	blobUrl := s.containerUrl.NewBlockBlobURL(storagePath)
	_, err = azblob.UploadFileToBlockBlob(context.Background(), file, blobUrl, azblob.UploadToBlockBlobOptions{
		BlobHTTPHeaders: azblob.BlobHTTPHeaders{ContentType: contentType},
		BlockSize:       4 * 1024 * 1024,
		Parallelism:     16,
	})
	if err != nil {
		return "", 0, err
	}

	return fmt.Sprintf("%s/%s", s.container, storagePath), stat.Size(), nil
}

func (s *azureBLOBStorage) ListObjects(prefix string) ([]string, error) {
	var objects []string

	for marker := (azblob.Marker{}); marker.NotDone(); {
		listBlob, err := s.containerUrl.ListBlobsFlatSegment(context.Background(), marker, azblob.ListBlobsSegmentOptions{
			Prefix: prefix,
		})
		if err != nil {
			return nil, err
		}

		marker = listBlob.NextMarker
		for _, blobInfo := range listBlob.Segment.BlobItems {
			objects = append(objects, blobInfo.Name)
		}
	}

	return objects, nil
}

func (s *azureBLOBStorage) DownloadData(storagePath string) ([]byte, error) {
	b := make([]byte, 0)

	blobUrl := s.containerUrl.NewBlobURL(storagePath)
	err := azblob.DownloadBlobToBuffer(context.Background(), blobUrl, 0, azblob.CountToEnd, b, azblob.DownloadFromBlobOptions{
		BlockSize:   4 * 1024 * 1024,
		Parallelism: 16,
		RetryReaderOptionsPerBlock: azblob.RetryReaderOptions{
			MaxRetryRequests: 3,
		},
	})
	if err != nil {
		return nil, err
	}

	return b, nil
}

func (s *azureBLOBStorage) DownloadFile(filepath, storagePath string) (int64, error) {
	file, err := os.Create(filepath)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	blobUrl := s.containerUrl.NewBlobURL(storagePath)
	err = azblob.DownloadBlobToFile(context.Background(), blobUrl, 0, 0, file, azblob.DownloadFromBlobOptions{
		BlockSize:   4 * 1024 * 1024,
		Parallelism: 16,
		RetryReaderOptionsPerBlock: azblob.RetryReaderOptions{
			MaxRetryRequests: 3,
		},
	})
	if err != nil {
		return 0, err
	}

	stat, err := file.Stat()
	if err != nil {
		return 0, err
	}
	return stat.Size(), nil
}

func (s *azureBLOBStorage) GeneratePresignedUrl(storagePath string, expiration time.Duration) (string, error) {
	if s.conf.TokenCredential == nil {
		return "", errors.New("OAuth required")
	}

	now := time.Now()
	exp := now.Add(expiration)

	serviceUrl := s.serviceUrl.WithPipeline(azblob.NewPipeline(s.conf.TokenCredential, azblob.PipelineOptions{}))
	udc, err := serviceUrl.GetUserDelegationCredential(
		context.Background(), azblob.NewKeyInfo(now, exp), nil, nil,
	)
	if err != nil {
		return "", err
	}

	qp, err := azblob.BlobSASSignatureValues{
		Protocol:      azblob.SASProtocolHTTPS,
		StartTime:     now,
		ExpiryTime:    exp,
		Permissions:   azblob.AccountSASPermissions{Read: true}.String(),
		ContainerName: s.conf.ContainerName,
		BlobName:      storagePath,
	}.NewSASQueryParameters(udc)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("https://%s.blob.core.windows.net?%s", s.conf.AccountName, qp.Encode()), nil
}

func (s *azureBLOBStorage) DeleteObject(storagePath string) error {
	blobUrl := s.containerUrl.NewBlobURL(storagePath)
	_, err := blobUrl.Delete(context.Background(), azblob.DeleteSnapshotsOptionNone, azblob.BlobAccessConditions{})
	return err
}

func (s *azureBLOBStorage) DeleteObjects(storagePaths []string) error {
	for _, path := range storagePaths {
		if err := s.DeleteObject(path); err != nil {
			return err
		}
	}
	return nil
}
