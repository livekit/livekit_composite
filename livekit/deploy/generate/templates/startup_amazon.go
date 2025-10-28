package templates

const CloudInitAmazon2Template = `#cloud-config
# This file is used as a user-data script to start a VM
# It'll upload configs to the right location and install LiveKit as a systemd service
# LiveKit will be started automatically at machine startup
repo_update: true
repo_upgrade: all

packages:
  - docker

bootcmd:
  - mkdir -p {{.InstallPrefix}}/caddy_data
  - mkdir -p /usr/local/bin

write_files:
  - path: {{.InstallPrefix}}/livekit.yaml
    content: |
{{.LiveKitConfig}}
  - path: {{.InstallPrefix}}/caddy.yaml
    content: |
{{.CaddyConfig}}
  - path: {{.InstallPrefix}}/update_ip.sh
    content: |
{{.UpdateIPScript}}
  - path: {{.InstallPrefix}}/docker-compose.yaml
    content: |
{{.DockerComposeConfig}}
  - path: /etc/systemd/system/livekit-docker.service
    content: |
{{.SystemService}}
{{- if .RedisConf }}
  - path: {{.InstallPrefix}}/redis.conf
    content: |
{{.RedisConf}}
{{- end }}
{{- if .EgressConf }}
  - path: {{.InstallPrefix}}/egress.yaml
    content: |
{{.EgressConf}}
{{- end }}
{{- if .IngressConf }}
  - path: {{.InstallPrefix}}/ingress.yaml
    content: |
{{.IngressConf}}
{{- end }}

runcmd:
  - curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  - chmod 755 /usr/local/bin/docker-compose
  - chmod 755 {{.InstallPrefix}}/update_ip.sh
  - {{.InstallPrefix}}/update_ip.sh
  - systemctl enable docker
  - systemctl start docker
  - systemctl enable livekit-docker
  - systemctl start livekit-docker
`
