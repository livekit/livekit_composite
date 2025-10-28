# Zscaler proxy configuration

If a Zscaler proxy is in use with Deep Packet Inspection enabled, connections to LiveKit will likely fail (including TURN). In order to fix this, customers will need to update their Zscaler configuration to bypass this:


- `url. domain=turn. livekit. cloud detect_protocol(no)`
- `url. domain=<project subdomain>. livekit. cloud detect_protocol(no)`

where `<project subdomain>` is the customer's LiveKit project subdomain