# Optimizing Video Calls for Low-Powered Devices in LiveKit (JS SDK ≥ v2.14.0)

When running 1:1 video calls, users connecting from **lower-end laptops** (typically with fewer than 6–8 CPU cores) may experience degraded video quality. This happens because the browser automatically reduces video resolution and frame rates when the CPU cannot keep up with real-time encoding and processing demands.

LiveKit JS Client SDK ( [v2.14.0](https://github. com/livekit/client-sdk-js/releases/tag/v2.14.0) and later) provides tools to detect and respond to these CPU constraints so you can optimize the experience for these users.

This guide shows you how to:


- Detect when the browser limits video quality due to CPU constraints
- Dynamically adjust settings to maintain performance
- Disable CPU-intensive features like Krisp noise cancellation and video processors (like background video processing)


## Why CPU Constraints Cause Video Degradation

WebRTC-enabled browsers constantly monitor system performance. When the CPU is overloaded, they reduce video resolution, frame rate, or encoding complexity. This is reported in the [WebRTC stats API](https://www. w3. org/TR/webrtc-stats/#dom-rtcoutboundrtpstreamstats-qualitylimitationreason) as a `qualityLimitationReason` of `cpu`.

In LiveKit JS SDK ≥ v2.14.0, you can listen for this condition using the `ParticipantEvent. LocalTrackCpuConstrained` event.


## Detecting CPU Constraints

The SDK emits `ParticipantEvent. LocalTrackCpuConstrained` ( [SDK source](https://github. com/livekit/client-sdk-js/blob/d2e7cdb167ee3c997a844f932253b2106967a50d/src/room/participant/LocalParticipant. ts#L2334-L2340)) when the browser reports CPU-based quality limitation.

Here’s how to listen for it:


## Recommended Optimizations for Low-Powered Devices

To reduce CPU load and maintain a smooth call:


### Disable Krisp Noise Cancellation

If your app uses **Krisp noise suppression**, disable it **before** the participant joins the room. Krisp is highly effective but consumes significant CPU resources. See the [docs](https://docs. livekit. io/home/cloud/noise-cancellation/#supported-platforms) for more details.


### Dynamically Reduce Video Quality

When CPU constraints are detected:


- Lower the publisher’s video quality
- Lower the subscriber’s video quality
- Stop any video processors (e. g., background blur) that add CPU load

Here’s a React hook that encapsulates this behavior:

Use it like this:


## Example in LiveKit Meet

The [meet. livekit. io](http://meet. livekit. io) app includes this optimization pattern. See the implementation in [GitHub PR #450](https://github. com/livekit-examples/meet/pull/450/files)