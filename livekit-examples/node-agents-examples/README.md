# LiveKit Agents Examples for Node.js

This repository contains examples demonstrating how to use the LiveKit Agents library (pre-v1) in Node.js applications. Each example showcases different use cases for building voice-enabled and or video-enabled applications with LiveKit.

## Projects

### [Basics](./basics)

Basic examples demonstrating core functionality of LiveKit Agents:

- Listen and Respond Agent: A simple conversational agent that listens to user speech and responds conversationally
- Uninterruptable Agent: Demonstrates non-interruptable behavior by telling a long story when a user starts speaking

See the [Basics README](./basics/README.md) for setup and running instructions.

### [SIP Make a Call](./sip/make-a-call)

This project demonstrates how to have a LiveKit agent make an outbound phone call using LiveKit's telephony capabilities. It creates a room, connects an agent, and initiates a SIP call to a specified phone number.

See the [SIP Make a Call README](./sip/make-a-call/README.md) for setup and running instructions.

### [SIP Um, Actually](./sip/um-actually)

A LiveKit Agent that hosts a game of "Um, Actually" with contestants that call in, using OpenAI's capabilities to process and respond to voice calls.

See the [SIP Um, Actually README](./sip/um-actually/README.md) for setup and running instructions.

## Getting Started

Each project has its own README with specific setup instructions. In general, you'll need:

1. Node.js 22 or higher
2. A LiveKit server (self-hosted or cloud)
3. Required API keys (OpenAI, Deepgram, etc.)

### Environment Variables

All projects use `.env.local` for storing API keys and configuration. Each project includes a `.env.example` file that you can use as a template:

```bash
cp .env.example .env.local
```

Required environment variables typically include:

- `LIVEKIT_API_KEY`: Your LiveKit API key
- `LIVEKIT_API_SECRET`: Your LiveKit API secret
- `LIVEKIT_URL`: Your LiveKit server URL
- `OPENAI_API_KEY`: Your OpenAI API key

For detailed setup instructions and specific environment variables, refer to each project's README.

## About LiveKit Agents

LiveKit Agents is an end-to-end framework that enables developers to build intelligent, multimodal voice assistants (AI agents) capable of engaging users through voice, video, and data channels.

This repository uses the pre-v1 version of the library. For the latest version, visit the [LiveKit Agents documentation](https://docs.livekit.io/agents/).
