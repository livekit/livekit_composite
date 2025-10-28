package templates

const DockerComposeBaseTemplate = `# This docker-compose requires host networking, which is only available on Linux
# This compose will not function correctly on Mac or Windows
services:
  caddy:
    image: livekit/caddyl4
    command: run --config /etc/caddy.yaml --adapter yaml
    restart: unless-stopped
    network_mode: "host"
    volumes:
      - ./caddy.yaml:/etc/caddy.yaml
      - ./caddy_data:/data
  livekit:
    image: livekit/livekit-server:{{.ServerVersion}}
    command: --config /etc/livekit.yaml
    restart: unless-stopped
    network_mode: "host"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
`

const DockerComposeRedisTemplate = `  redis:
    image: redis:7-alpine
    command: redis-server /etc/redis.conf
    restart: unless-stopped
    network_mode: "host"
    volumes:
      - ./redis.conf:/etc/redis.conf
`

const DockerComposeEgressTemplate = `  egress:
    image: livekit/egress:latest
    restart: unless-stopped
    environment:
      - EGRESS_CONFIG_FILE=/etc/egress.yaml
    network_mode: "host"
    volumes:
      - ./egress.yaml:/etc/egress.yaml
    cap_add:
      - CAP_SYS_ADMIN
`

const DockerComposeIngressTemplate = `  ingress:
    image: livekit/ingress:latest
    restart: unless-stopped
    environment:
      - INGRESS_CONFIG_FILE=/etc/ingress.yaml
    network_mode: "host"
    volumes:
      - ./ingress.yaml:/etc/ingress.yaml
`
