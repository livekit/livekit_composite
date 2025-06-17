# Firewall Tips

[Link to LiveKit Docs](https://docs. livekit. io/home/cloud/firewall/)

There are two phases for media connectivity:


### 1. ICE (Interactive Connectivity Establishment)

This is the initial phase where both sides (client and server) probe all possible network interfaces and paths to determine the best available connection route (e. g., direct via UDP, direct via TCP, or relayed via TURN UDP/TLS). After this phase, a timer is set for the next phase to complete.


### 2. DTLS+SRTP

Once ICE completes, a DTLS (Datagram Transport Layer Security) handshake is used to exchange keys for SRTP (Secure Real-Time Transport Protocol), which encrypts the media as it begins to flow.


### What Happens When the Connection Fails?

If the DTLS+SRTP process times out, it usually means that:


- A **firewall or NAT device** allowed initial UDP packets through but then blocked subsequent ones (rare, but not unheard of with UDP).
- There may be filtering specifically for DTLS traffic.

LiveKit server implements custom **transport fallback logic**, where the client will retry using TCP or TURN. However, if the participant does not reconnect to the **same media node** (a rare situation based on LiveKit's routing mechanisms), the fallback will not work properly.


### Why TURN May Be Reachable When the SFU Is Not

**Firewalls often block UDP traffic or unknown ports**, while still allowing:


- **TURN over TCP/TLS on port 443**, because it mimics normal HTTPS traffic.

This makes TURN more firewall-friendly.

Example: A corporate firewall that blocks all UDP, but allows outbound TCP/443


- Clients can’t reach the SFU directly, but can connect through TURN.
- In this case, the firewall may need to whitelist `*. turn. livekit. cloud` on TCP/443


### Transport Priorities

WebRTC chooses transport in this order (highest to lowest):


1. ICE/UDP
2. ICE/TCP
3. TURN/UDP
4. TURN/TLS (TCP over port 443)

Clients only fall back to TURN if all higher-priority options fail. If UDP connects briefly but then breaks (a common "UDP whack" issue), fallback may not trigger unless explicitly configured.


### Forcing TURN for Firewall-Sensitive Users

You can force clients to always use TURN (relay-only) by setting:


```
connectOpts.rtcConfig = { iceTransportPolicy: 'relay' };
```

Even when forcing TURN, clients may still end up connecting to the TURN server embedded in the media node (which uses UDP) and may still face the same issue where UDP is blocked. Future work includes allowing clients to force TURN/TLS.


### Troubleshooting Steps


1. Run the [LiveKit Connection Tester](https://livekit. io/connection-test) with and without a firewall.
2. Look for failed UDP or DTLS stages.
3. If issues occur: Force TURN in the client (shown above)Whitelist `*. turn. livekit. cloud` if needed