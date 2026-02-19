# Architecture

## System diagram

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Browser │ ◄─────► │ LiveKit │ ◄─────► │ Gemini  │
│         │ WebRTC  │ Server  │  gRPC   │   API   │
└─────────┘         └─────────┘         └─────────┘
     │                   │                   │
     │                   │                   │
  Video/Audio         Room/Agent         LLM/Vision
  Tracks              Management         Processing
```

The browser connects to LiveKit via WebRTC, sending audio and video tracks. LiveKit manages the room and routes media to the agent. The agent processes frames with Gemini's vision capabilities and audio with Gemini's native audio processing.

## Why LiveKit?

- **WebRTC handling**: LiveKit manages all WebRTC complexity, including connection negotiation, media routing, and quality adaptation
- **Global infrastructure**: Built-in CDN and edge servers reduce latency worldwide
- **Media quality**: Automatic bitrate adaptation and quality optimization for varying network conditions

## Why Gemini Live API?

- **Native audio**: Processes audio directly without separate STT/TTS pipelines, reducing latency
- **Multimodal**: Handles both audio and video in a single API call
- **Low latency**: Optimized for real-time conversation with sub-second response times

## Key concepts

**Room**: A LiveKit room represents a session where participants (users and agents) exchange media. Each session creates a room automatically.

**Agent**: The Python process that connects to a room and processes media. It uses the Gemini API to understand audio and video, then responds with synthesized speech.

**Tracks**: Media streams (audio/video) published by participants. The agent subscribes to user tracks and publishes its own audio track.

**Function calling**: Tools that the agent can invoke during conversation. Useful for external API calls, database queries, or triggering actions.
