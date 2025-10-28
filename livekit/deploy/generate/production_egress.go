package main

import (
	"fmt"
	"os"
	"path"

	"gopkg.in/yaml.v3"

	"github.com/livekit/livekit-server/pkg/config"
	"github.com/livekit/protocol/redis"
)

// duplicate of livekit/egress/pkg/config/egress.go
// avoid importing the entire package during build
type egressConfig struct {
	Redis     *redis.RedisConfig `yaml:"redis"`
	ApiKey    string             `yaml:"api_key"`
	ApiSecret string             `yaml:"api_secret"`
	WsUrl     string             `yaml:"ws_url"`
}

func generateEgress(opts *ServerOptions, lkConf *config.Config, baseDir string) error {
	if !opts.IncludeEgress {
		return nil
	}
	egressConf := &egressConfig{}
	apiKey, apiSecret, err := getAPIKeySecret(lkConf)
	if err != nil {
		return err
	}
	egressConf.ApiKey = apiKey
	egressConf.ApiSecret = apiSecret
	egressConf.WsUrl = fmt.Sprintf("wss://%s", opts.Domain)
	egressConf.Redis = opts.RedisConfig()

	// write config
	data, err := yaml.Marshal(&egressConf)
	if err != nil {
		return err
	}
	opts.Files.Egress = path.Join(baseDir, "egress.yaml")
	return os.WriteFile(opts.Files.Egress, data, filePerms)
}
