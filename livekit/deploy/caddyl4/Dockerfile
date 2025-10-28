FROM golang:1.25-alpine AS builder

ARG TARGETOS
ARG TARGETPLATFORM
ARG TARGETARCH
ARG CADDY_VERSION="v2.10.2"
ENV CADDY_VERSION=$CADDY_VERSION
RUN echo building caddy $CADDY_VERSION for "$TARGETOS"

WORKDIR /workspace

RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

RUN GOOS=$TARGETOS GOARCH=$TARGETARCH xcaddy build \
    --with github.com/abiosoft/caddy-yaml \
    --with github.com/mholt/caddy-l4

FROM alpine

COPY --from=builder /workspace/caddy /bin/caddy

# Run the binary.
ENTRYPOINT ["/bin/caddy"]
