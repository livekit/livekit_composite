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
	"time"

	"github.com/Azure/azure-storage-blob-go/azblob"
)

type S3Config struct {
	AccessKey      string       `yaml:"access_key"`
	Secret         string       `yaml:"secret"`
	SessionToken   string       `yaml:"session_token"`
	Region         string       `yaml:"region"`
	Endpoint       string       `yaml:"endpoint"`
	Bucket         string       `yaml:"bucket"`
	ForcePathStyle bool         `yaml:"force_path_style"`
	ProxyConfig    *ProxyConfig `yaml:"proxy_config"`

	MaxRetries    int           `yaml:"max_retries"`
	MaxRetryDelay time.Duration `yaml:"max_retry_delay"`
	MinRetryDelay time.Duration `yaml:"min_retry_delay"`

	Metadata           map[string]string `yaml:"metadata"`
	Tagging            string            `yaml:"tagging"`
	ContentDisposition string            `yaml:"content_disposition"`
}

type AzureConfig struct {
	AccountName     string                 `yaml:"account_name"` // (env AZURE_STORAGE_ACCOUNT)
	AccountKey      string                 `yaml:"account_key"`  // (env AZURE_STORAGE_KEY)
	ContainerName   string                 `yaml:"container_name"`
	TokenCredential azblob.TokenCredential `yaml:"-"` // required for presigned url generation
}

type GCPConfig struct {
	CredentialsJSON string       `yaml:"credentials_json"` // (env GOOGLE_APPLICATION_CREDENTIALS)
	Bucket          string       `yaml:"bucket"`
	ProxyConfig     *ProxyConfig `yaml:"proxy_config"`
}

type AliOSSConfig struct {
	AccessKey string `yaml:"access_key"`
	Secret    string `yaml:"secret"`
	Endpoint  string `yaml:"endpoint"`
	Bucket    string `yaml:"bucket"`
}

type ProxyConfig struct {
	Url      string `yaml:"url"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}
