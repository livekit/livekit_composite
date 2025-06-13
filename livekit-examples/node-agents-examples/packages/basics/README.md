# LiveKit Agent Examples - Basics

This directory contains basic examples of LiveKit Agents that demonstrate different voice interaction patterns.

## Prerequisites 📋

- Node.js (v20 or higher) 💻
- [A LiveKit server instance 📡](https://docs.livekit.io/home/self-hosting/server-setup/)
- [An OpenAI API key 🔑](https://platform.openai.com/api-keys)
- [Deepgram API key 💬](https://developers.deepgram.com/docs/create-additional-api-keys)
- LiveKit API Key, Secret, and URL 🌐

## Examples

### Listen and Respond Agent

A simple agent that listens to user speech and responds conversationally.

```bash
npm run start:listen-and-respond
```

### Uninterruptable Agent

An agent that demonstrates non-interruptable behavior. When a user starts speaking, it will interrupt them to tell a long story.

```bash
npm run start:uninterruptable
```

## Setup 🛠️

1. Clone the repository:

   ```bash
   git clone https://github.com/livekit-examples/node-agents-examples.git

   cd node-agents-examples
   
   npm install
   
   cd packages/basics
   ```

2. Create a `.env.local` file with your API keys:

   ```bash
   cp .env.example .env.local
   ```

3. Configure your environment variables in `.env.local`:

   - `LIVEKIT_API_KEY`: Your LiveKit API key
   - `LIVEKIT_API_SECRET`: Your LiveKit API secret
   - `LIVEKIT_URL`: Your LiveKit server URL
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `DEEPGRAM_API_KEY`: Your Deepgram API key

4. Run the examples using the npm scripts in the [Examples section above](#examples).

## License 📝

[Apache-2.0](../../LICENSE.md)
