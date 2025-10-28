package templates

const CaddyConfigTemplate = `logging:
  logs:
    default:
      level: INFO
storage:
  "module": "file_system"
  "root": "/data"
apps:
  tls:
    certificates:
      automate:
        - {{.Domain}}
        - {{.TURNDomain}}
{{- if .WHIPDomain }}
        - {{.WHIPDomain}}
{{- end }}
{{- if .ZeroSSLAPIKey }}
    automation:
      policies:
        - issuers:
          - module: zerossl
            api_key: {{.ZeroSSLAPIKey}}
{{- end }}
  layer4:
    servers:
      main:
        listen: [":443"]
        routes:
          - match:
            - tls:
                sni:
                  - "{{.TURNDomain}}"
            handle:
              - handler: tls
              - handler: proxy
                upstreams:
                  - dial: ["localhost:5349"]
          - match:
              - tls:
                  sni:
                    - "{{.Domain}}"
            handle:
              - handler: tls
                connection_policies:
                  - alpn: ["http/1.1"]
              - handler: proxy
                upstreams:
                  - dial: ["localhost:7880"]
{{- if .WHIPDomain }}
          - match:
              - tls:
                  sni:
                    - "{{.WHIPDomain}}"
            handle:
              - handler: tls
                connection_policies:
                  - alpn: ["http/1.1"]
              - handler: proxy
                upstreams:
                  - dial: ["localhost:8080"]
{{- end }}
`
