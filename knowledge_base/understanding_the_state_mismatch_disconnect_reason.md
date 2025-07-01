# Understanding the STATE_MISMATCH Disconnect Reason

Users may see that a participant has disconnected due to a `STATE_MISMATCH`. This article explains what this reason means.


## Background

WebRTC media connections use ICE/STUN keep-alives to verify connectivity. If the server stops receiving keep-alives from the client for ~20 seconds, it assumes the media path is dead. The [client typically detects a problem after 15 seconds](https://github. com/livekit/client-sdk-js/blob/81c4c786ee6938e5dcc41ff4a4592849d9dc772f/src/options. ts#L111) and may try to reconnect.

Internally, the SFU maintains a detailed set of internal reasons to describe why a participant's session is being closed/disconnected (`ParticipantCloseReason` - defined [here](https://github. com/livekit/livekit/blob/4d09e5b564a717a33dcfe57cf30b05e38d469b5f/pkg/rtc/types/interfaces. go#L85-L116)). These internal reasons are [mapped](https://github. com/livekit/livekit/blob/4d09e5b564a717a33dcfe57cf30b05e38d469b5f/pkg/rtc/types/interfaces. go#L181-L217) to a simplified, [public-facing enum called](https://github. com/livekit/protocol/blob/ea7ec44ada466610e12e91b3f60351a13ee78739/protobufs/livekit_models. proto#L472-L504)`DisconnectReason`, which is what clients receive.


## What IsSTATE_MISMATCH?

`STATE_MISMATCH` is a disconnect reason used by the SFU to indicate that the server and the client have fallen out of sync regarding the state of the media connection. This is distinct from issues with the signaling connection — it specifically relates to the media path (audio/video data).

**Note:** The internal-to-public mapping is not perfect in all cases. In scenarios where a precise match isn’t available, the most semantically appropriate `DisconnectReason` is chosen — and sometimes that ends up being `STATE_MISMATCH`.


## What CausesSTATE_MISMATCH?

There are a few common causes where `STATE_MISMATCH` might be used:


- **Unclean Client Disconnects:** If a client leaves a session without properly sending a `LeaveRequest` (due to a bug or abrupt shutdown), the server eventually detects the absence and initiates cleanup.
- **Client Crash:** If the client crashes unexpectedly, it won’t be able to notify the server of the disconnection. After a timeout, the server initiates disconnection.
- **Network Blackouts:** In network blackouts, the client reconnect attempt never reaches the server, and the server then disconnects with `STATE_MISMATCH`.


## STATE_MISMATCHvs.PEER_CONNECTION_DISCONNECT

It's important to distinguish `STATE_MISMATCH` from `PEER_CONNECTION_DISCONNECT`:


- `PEER_CONNECTION_DISCONNECT` indicates that the *media* connection (not signaling) has been lost due to network issues — e. g., packet loss, firewall blocks, sudden IP changes.
- `STATE_MISMATCH` generally implies a timeout or disconnect event where the server and client disagree about the session's current state, often due to a client that has become unresponsive or disconnected in an unexpected way.

While these scenarios overlap, `STATE_MISMATCH` is more about inconsistency or lack of coordination in session lifecycle handling, whereas `PEER_CONNECTION_DISCONNECT` is a more direct consequence of media transport failure.