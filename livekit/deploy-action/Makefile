DOCKER_REPO=docker.io/livekit/cloud-agents-github-plugin
VERSION=v0.0.203

all: build publish clean

build:
	docker build --platform linux/amd64 -t $(DOCKER_REPO):$(VERSION) -f Dockerfile .
publish:
	docker push $(DOCKER_REPO):$(VERSION)
clean:
	docker rmi $(DOCKER_REPO):$(VERSION)

.PHONY: all build publish clean
