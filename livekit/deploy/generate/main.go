package main

import (
	"fmt"
	"math/rand"
	"os"
	"path"
	"time"

	"github.com/urfave/cli/v2"

	"github.com/livekit/protocol/auth"
)

const (
	filePerms    = 0644
	dockerOutput = "/output"
)

func init() {
	rand.Seed(time.Now().Unix())
}

func main() {
	app := &cli.App{
		Name:    "generate",
		Usage:   "Generates Configurations for LiveKit",
		Version: "1.0.0",
		Action:  startGenerator,
		Flags: []cli.Flag{
			&cli.BoolFlag{
				Name:  "local",
				Usage: "generates local config",
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		fmt.Println(err)
	}
}

func startGenerator(c *cli.Context) error {
	if c.Bool("local") {
		return generateLocal()
	}
	return generateProduction()
}

func printKeysAndToken(apiKey, apiSecret string) error {
	token := auth.NewAccessToken(apiKey, apiSecret)
	token.SetIdentity("test-user")
	token.SetName("Test User")
	token.AddGrant(&auth.VideoGrant{
		Room:     "my-first-room",
		RoomJoin: true,
	})
	token.SetValidFor(10000 * time.Hour)
	jwt, err := token.ToJWT()
	if err != nil {
		return err
	}
	fmt.Println("API Key: " + apiKey)
	fmt.Println("API Secret: " + apiSecret)
	fmt.Println()
	fmt.Println("Here's a test token generated with your keys: " + jwt)
	fmt.Println()
	fmt.Println("An access token identifies the participant as well as the room it's connecting to")
	return nil
}

// map differences between docker environment
func outputPath(file string) string {
	if !isDocker() {
		return file
	}
	return path.Join(dockerOutput, file)
}

func isDocker() bool {
	_, err := os.Stat("/.dockerenv")
	if err == nil {
		return true
	}
	_, err = os.Stat("/run/.containerenv")
	if err == nil {
		return true
	}
	return false
}
