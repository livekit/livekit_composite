package templates

const SystemdServiceTemplate = `[Unit]
Description=LiveKit Server Container
After=docker.service
Requires=docker.service

[Service]
LimitNOFILE=500000
Restart=always
WorkingDirectory={{.InstallPrefix}}
# Shutdown container (if running) when unit is started
ExecStartPre=/usr/local/bin/docker-compose -f docker-compose.yaml down
ExecStart=/usr/local/bin/docker-compose -f docker-compose.yaml up
ExecStop=/usr/local/bin/docker-compose -f docker-compose.yaml down

[Install]
WantedBy=multi-user.target
`
