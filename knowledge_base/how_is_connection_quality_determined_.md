# How is Connection Quality determined?

## Background

Within LiveKit, there are [3 values](https://github. com/livekit/protocol/blob/fa4bb37c0caf3dcd5d94956d8c6d4be5959cf173/protobufs/livekit_models. proto#L373-L378) that represent connection quality:


1. Poor
2. Good
3. Excellent

Participants connected to LiveKit receive events from the LiveKit server whenever a participant's connection quality changes.


## Details

The code for calculating the connection quality is [here](https://github. com/livekit/livekit/blob/8cc17f8f8b7092336b224bd6f0eca14a5bac166d/pkg/sfu/connectionquality/scorer. go#L425-L444). The calculation for quality is made up of 3 components:


1. [packet loss](https://github. com/livekit/livekit/blob/8cc17f8f8b7092336b224bd6f0eca14a5bac166d/pkg/sfu/connectionquality/scorer. go#L72-L130)
2. are all video layers sent
3. [bitrates](https://github. com/livekit/livekit/blob/8cc17f8f8b7092336b224bd6f0eca14a5bac166d/pkg/sfu/connectionquality/scorer. go#L132-L153)

*jitter and RTT (round trip time) are disabled in `calculatePacketScore`