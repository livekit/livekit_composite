package main

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"

	"github.com/livekit/livekit-server/pkg/config"
	"github.com/livekit/mediatransportutil/pkg/rtcconfig"
	"github.com/livekit/protocol/logger"
	"github.com/livekit/protocol/utils"
)

func generateLocal() error {
	apiKey := utils.NewGuid(utils.APIKeyPrefix)
	apiSecret := utils.RandomSecret()
	conf := config.Config{
		Keys: map[string]string{
			apiKey: apiSecret,
		},
		Logging: config.LoggingConfig{
			Config: logger.Config{
				JSON:  false,
				Level: "info",
			},
		},
		Port: 7880,
		RTC: config.RTCConfig{
			RTCConfig: rtcconfig.RTCConfig{
				TCPPort:       7881,
				UDPPort:       7882,
				UseExternalIP: false,
			},
		},
	}

	out, err := os.Create(outputPath("livekit.yaml"))
	if err != nil {
		return err
	}
	defer out.Close()

	data, err := yaml.Marshal(&conf)
	if err != nil {
		return err
	}
	err = os.WriteFile(outputPath("livekit.yaml"), data, filePerms)
	if err != nil {
		return err
	}

	// get local ip
	ips, err := rtcconfig.GetLocalIPAddresses(false)
	if err != nil {
		return err
	}

	ip := "127.0.0.1"
	if !isDocker() && len(ips) > 0 {
		ip = ips[0]
	}

	fmt.Println("Generated livekit.yaml that's suitable for local testing")
	fmt.Println()
	fmt.Println("Start LiveKit with:")
	fmt.Println("docker run --rm \\")
	fmt.Println("    -p 7880:7880 \\")
	fmt.Println("    -p 7881:7881 \\")
	fmt.Println("    -p 7882:7882/udp \\")
	fmt.Println("    -v $PWD/livekit.yaml:/livekit.yaml \\")
	fmt.Println("    livekit/livekit-server \\")
	fmt.Println("    --config /livekit.yaml \\")
	fmt.Println("    --node-ip=" + ip)
	fmt.Println()
	if isDocker() {
		fmt.Println("Note: --node-ip needs to be reachable by the client. 127.0.0.1 is accessible only to the current machine")
		fmt.Println()
	}

	fmt.Println("Server URL: ", "ws://localhost:7880")
	return printKeysAndToken(apiKey, apiSecret)
}
