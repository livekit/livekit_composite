package templates

// UpdateIPScript is a script that gets the first local IP and updates caddy's TURN upstream with it
// using a non-loopback IP is required for TURN/TLS to work with Firefox
const UpdateIPScript = `#!/usr/bin/env bash
ip=` + "`" + `ip addr show |grep "inet " |grep -v 127.0.0. |head -1|cut -d" " -f6|cut -d/ -f1` + "`" + `
sed -i.orig -r "s/\\\"(.+)(\:5349)/\\\"$ip\2/" /opt/livekit/caddy.yaml
`
