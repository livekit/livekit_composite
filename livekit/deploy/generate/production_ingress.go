package main

import (
	"fmt"
	"os"
	"path"

	"gopkg.in/yaml.v3"

	"github.com/livekit/livekit-server/pkg/config"
	"github.com/livekit/mediatransportutil/pkg/rtcconfig"
	"github.com/livekit/protocol/logger"
	"github.com/livekit/protocol/redis"
)

const (
	DefaultRTMPPort      = 1935
	DefaultWHIPPort      = 8080
	DefaultHTTPRelayPort = 9090
	DefaultRTCUDPPort    = 7885
)

// duplicate of livekit/ingress/pkg/config/config.go
// avoid importing the entire package during build
type ingressConfig struct {
	Redis         *redis.RedisConfig  `yaml:"redis"`
	ApiKey        string              `yaml:"api_key"`
	ApiSecret     string              `yaml:"api_secret"`
	WsUrl         string              `yaml:"ws_url"`
	RTMPPort      int                 `yaml:"rtmp_port"`
	WHIPPort      int                 `yaml:"whip_port"` // -1 to disable WHIP
	HTTPRelayPort int                 `yaml:"http_relay_port"`
	Logging       logger.Config       `yaml:"logging"`
	Development   bool                `yaml:"development"`
	RTCConfig     rtcconfig.RTCConfig `yaml:"rtc_config"`
}

func generateIngress(opts *ServerOptions, lkConf *config.Config, baseDir string) error {
	if !opts.IncludeIngress {
		return nil
	}

	ingressConf := &ingressConfig{}
	apiKey, apiSecret, err := getAPIKeySecret(lkConf)
	if err != nil {
		return err
	}
	ingressConf.ApiKey = apiKey
	ingressConf.ApiSecret = apiSecret
	ingressConf.WsUrl = fmt.Sprintf("wss://%s", opts.Domain)
	ingressConf.Redis = opts.RedisConfig()
	ingressConf.RTMPPort = DefaultRTMPPort
	ingressConf.WHIPPort = DefaultWHIPPort
	ingressConf.HTTPRelayPort = DefaultHTTPRelayPort
	ingressConf.RTCConfig.UDPPort = DefaultRTCUDPPort
	ingressConf.RTCConfig.UseExternalIP = true

	// write config
	data, err := yaml.Marshal(ingressConf)
	if err != nil {
		return err
	}
	opts.Files.Ingress = path.Join(baseDir, "ingress.yaml")
	return os.WriteFile(opts.Files.Ingress, data, filePerms)
}
