FROM golang:1.25-alpine as builder

ARG TARGETOS
ARG TARGETPLATFORM
ARG TARGETARCH
RUN echo building execute for "$TARGETPLATFORM"

WORKDIR /workspace

COPY . .

WORKDIR /workspace/generate

RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build

FROM alpine

COPY --from=builder /workspace/generate/generate /bin/generate

# Run the binary.
ENTRYPOINT ["/bin/generate"]
