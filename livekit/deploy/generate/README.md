# Deployment Config Generator

## Local mode

`generate --local` to generate a simple livekit.yaml for local testing.

## Generator wizard

Run `generate` without args to start a set of prompt that lets you customize a production deployment.

It generates

* LiveKit config tuned for production with TURN/TLS
* Caddy config for automatic TLS certificate provision
* Bundled Redis config
* Containerized config with docker-compose
* systemd service
* cloud-init or init shell script to install the above
