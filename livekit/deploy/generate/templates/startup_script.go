package templates

const StartupScriptTemplate = `#!/bin/sh
# This script will write all of your configurations to {{.InstallPrefix}}.
# It'll also install LiveKit as a systemd service that will run at startup
# LiveKit will be started automatically at machine startup.

# create directories for LiveKit
mkdir -p {{.InstallPrefix}}/caddy_data
mkdir -p /usr/local/bin

# Docker & Docker Compose will need to be installed on the machine
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod 755 /usr/local/bin/docker-compose

sudo systemctl enable docker

# livekit config
cat << EOF > {{.InstallPrefix}}/livekit.yaml
{{.LiveKitConfig}}
EOF

# caddy config
cat << EOF > {{.InstallPrefix}}/caddy.yaml
{{.CaddyConfig}}
EOF

# update ip script
cat << "EOF" > {{.InstallPrefix}}/update_ip.sh
{{.UpdateIPScript}}
EOF

# docker compose
cat << EOF > {{.InstallPrefix}}/docker-compose.yaml
{{.DockerComposeConfig}}
EOF

# systemd file
cat << EOF > /etc/systemd/system/livekit-docker.service
{{.SystemService}}
EOF

{{- if .RedisConf }}
# redis config
cat << EOF > {{.InstallPrefix}}/redis.conf
{{.RedisConf}}
EOF
{{- end }}

{{- if .EgressConf }}
# egress config
cat << EOF > {{.InstallPrefix}}/egress.yaml
{{.EgressConf}}
EOF
{{- end }}

{{- if .IngressConf }}
# ingress config
cat << EOF > {{.InstallPrefix}}/ingress.yaml
{{.IngressConf}}
EOF
{{- end }}

chmod 755 {{.InstallPrefix}}/update_ip.sh
{{.InstallPrefix}}/update_ip.sh

systemctl enable livekit-docker
systemctl start livekit-docker
`
