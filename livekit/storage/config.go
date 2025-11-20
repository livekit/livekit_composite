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

type AliOSSConfig struct {
	AccessKey string `yaml:"access_key,omitempty"`
	Secret    string `yaml:"secret,omitempty"`
	Endpoint  string `yaml:"endpoint,omitempty"`
	Bucket    string `yaml:"bucket,omitempty"`
}

type AzureConfig struct {
	AccountName     string                 `yaml:"account_name,omitempty"` // (env AZURE_STORAGE_ACCOUNT)
	AccountKey      string                 `yaml:"account_key,omitempty"`  // (env AZURE_STORAGE_KEY)
	ContainerName   string                 `yaml:"container_name,omitempty"`
	TokenCredential azblob.TokenCredential `yaml:"-"` // required for presigned url generation
}

type GCPConfig struct {
	CredentialsJSON string       `yaml:"credentials_json,omitempty"` // (env GOOGLE_APPLICATION_CREDENTIALS)
	Bucket          string       `yaml:"bucket,omitempty"`
	ProxyConfig     *ProxyConfig `yaml:"proxy_config,omitempty"`
}

type LocalConfig struct {
	StorageDir string `yaml:"storage_dir,omitempty"`
}

type S3Config struct {
	AccessKey            string       `yaml:"access_key,omitempty"`
	Secret               string       `yaml:"secret,omitempty"`
	SessionToken         string       `yaml:"session_token,omitempty"`
	AssumeRoleArn        string       `yaml:"assume_role_arn,omitempty"`         // ARN of the role to assume for file upload. Egress will make an AssumeRole API call using the provided access_key and secret to assume that role
	AssumeRoleExternalId string       `yaml:"assume_role_external_id,omitempty"` // ExternalID to use when assuming role for upload
	Region               string       `yaml:"region,omitempty"`
	Endpoint             string       `yaml:"endpoint,omitempty"`
	Bucket               string       `yaml:"bucket,omitempty"`
	ForcePathStyle       bool         `yaml:"force_path_style,omitempty"`
	ProxyConfig          *ProxyConfig `yaml:"proxy_config,omitempty"`

	MaxRetries    int           `yaml:"max_retries,omitempty"`
	MaxRetryDelay time.Duration `yaml:"max_retry_delay,omitempty"`
	MinRetryDelay time.Duration `yaml:"min_retry_delay,omitempty"`

	Metadata           map[string]string `yaml:"metadata,omitempty"`
	Tagging            string            `yaml:"tagging,omitempty"`
	ContentDisposition string            `yaml:"content_disposition,omitempty"`
}

type ProxyConfig struct {
	Url      string `yaml:"url,omitempty"`
	Username string `yaml:"username,omitempty"`
	Password string `yaml:"password,omitempty"`
}
