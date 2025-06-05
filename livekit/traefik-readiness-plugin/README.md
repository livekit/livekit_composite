# Traefik Readiness Plugin

This plugin adds an readiness endpoint that is useful when Traefik is deployed in Kubernetes. The plugin:

- Only returns a 200 OK response after Traefik has finished loading all dynamic configuration.
- Makes sure container CPU usage is below a conifurable threshold. This is useful when Traefik serves long running requests, especially when using autoscaling.

## Configuration

Traefik Helm chart values:

```yaml
deployment:
  healthchecksPort: 8082
  readinessPath: /ready # depends on https://github.com/traefik/traefik-helm-chart/pull/1041

experimental:
  plugins:
    readiness:
      moduleName: github.com/livekit/traefik-readiness-plugin
      version: v0.0.2-alpha.1

ingressRoute:
  healthcheck:
    enabled: true
    matchRule: PathPrefix(`/ping`) || PathPrefix(`/ready`)
    entryPoints:
      - ping
    middlewares:
      - name: readiness

readinessProbe:
  initialDelaySeconds: 5
livenessProbe:
  initialDelaySeconds: 5

ports:
  ping:
    port: 8082
    expose:
      default: true
    exposedPort: 8082
    protocol: TCP
```

Middleware:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: readiness
  namespace: traefik
spec:
  plugin:
    readiness:
      ReadyPath: /ready
      ReadyCPULimit: 0.8
```
