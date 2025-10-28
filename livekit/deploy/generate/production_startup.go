package main

import (
	"bytes"
	"os"
	"path"
	"text/template"

	"github.com/livekit/deploy/generate/templates"
)

type cloudInitContent struct {
	InstallPrefix       string
	LiveKitConfig       string
	CaddyConfig         string
	DockerComposeConfig string
	SystemService       string
	RedisConf           string
	EgressConf          string
	IngressConf         string
	UpdateIPScript      string
}

func generateStartupScript(opts *ServerOptions, baseDir string) error {
	if opts.CloudInit == StartupScriptNone {
		return nil
	}

	// prep files
	var err error
	content := cloudInitContent{
		InstallPrefix:  "/opt/livekit",
		UpdateIPScript: templates.UpdateIPScript,
	}
	// six space indent for yaml types
	indent := "      "
	if opts.CloudInit == StartupScriptShellScript {
		indent = ""
	}
	if content.LiveKitConfig, err = readAndPrefix(opts.Files.LiveKit, indent); err != nil {
		return err
	}
	if content.CaddyConfig, err = readAndPrefix(opts.Files.Caddy, indent); err != nil {
		return err
	}
	if content.DockerComposeConfig, err = readAndPrefix(opts.Files.Docker, indent); err != nil {
		return err
	}
	if opts.LocalRedis {
		if content.RedisConf, err = readAndPrefix(opts.Files.RedisConf, indent); err != nil {
			return err
		}
	}
	if opts.IncludeEgress {
		if content.EgressConf, err = readAndPrefix(opts.Files.Egress, indent); err != nil {
			return err
		}
	}
	if opts.IncludeIngress {
		if content.IngressConf, err = readAndPrefix(opts.Files.Ingress, indent); err != nil {
			return err
		}
	}
	content.UpdateIPScript = prefixLines(templates.UpdateIPScript, indent)

	// system service
	tmpl, err := template.New("systemd").Parse(templates.SystemdServiceTemplate)
	if err != nil {
		return err
	}
	buf := bytes.NewBuffer(nil)
	if err = tmpl.Execute(buf, &content); err != nil {
		return err
	}
	content.SystemService = prefixLines(buf.String(), indent)

	tmpl, err = template.New("cloud-init").Parse(opts.CloudInit.Template())
	if err != nil {
		return err
	}

	target := path.Join(baseDir, string(opts.CloudInit))
	f, err := os.Create(target)
	if err != nil {
		return err
	}
	defer f.Close()

	return tmpl.Execute(f, &content)
}
