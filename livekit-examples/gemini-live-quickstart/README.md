# Gemini LiveKit Quickstart

A starter kit for building voice and vision agents with Gemini Live API and LiveKit. Get from zero to a working multimodal agent in under 10 minutes.

## Install the LiveKit MCP server

**This is important.** Before you start building, install the LiveKit MCP (Model Context Protocol) server in your IDE. This gives your AI coding assistant direct access to LiveKit documentation so it can help you customize and develop your app with accurate, current information.

The MCP server includes tools that let your AI assistant browse and search the docs site as you code.

### Installation by IDE

**Cursor**

Click this button to install:

[![Install MCP Server in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=livekit-docs&config=eyJ1cmwiOiJodHRwczovL2RvY3MubGl2ZWtpdC5pby9tY3AifQ%3D%3D)

Or add it manually to your MCP settings:

```json
{
  "livekit-docs": {
    "url": "https://docs.livekit.io/mcp"
  }
}
```

**Claude Code**

```bash
claude mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

**Codex**

```bash
codex mcp add --url https://docs.livekit.io/mcp livekit-docs
```

**Gemini CLI**

```bash
gemini mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

**Other IDEs**

Add this URL to your MCP client. Set the transport to `http` or "Streamable HTTP" if prompted:

```
https://docs.livekit.io/mcp
```

## Prerequisites

- Python 3.10+ (but < 3.14)
- Node.js 18+
- LiveKit CLI installed:
  - macOS: `brew install livekit-cli`
  - Linux: `curl -sSL https://get.livekit.io/cli | bash`
  - Windows: `winget install LiveKit.LiveKitCLI`
- LiveKit Cloud account
- Google API key for Gemini

## Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/livekit-examples/gemini-live-quickstart.git
   cd gemini-livekit-quickstart
   ```

2. Set up the agent:
   ```bash
   cd agent
   uv sync
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. Set up the frontend:
   ```bash
   cd ../frontend
   pnpm install
   cp .env.example .env.local
   # Edit .env.local with your LiveKit credentials
   ```

4. Configure environment variables (optional - you can also edit .env.local files directly):
   ```bash
   # In the agent directory
   cd ../agent
   lk app env -w
   
   # In the frontend directory
   cd ../frontend
   lk app env -w
   ```

5. Run the agent:
   ```bash
   cd agent
   uv run agent.py dev
   ```

6. Run the frontend (in a new terminal):
   ```bash
   cd frontend
   pnpm dev
   ```

## What you should see

Open `http://localhost:3000` in your browser. You'll see a control bar with microphone and camera buttons. Click "Start" to begin a session. The agent will greet you and ask what you'd like it to watch and comment on. Enable your camera to let the agent see what you're showing it.

## Try the sports commentator example

Want to see a pre-configured agent in action? This repo includes a `sports-commentator` branch with a sports commentary agent ready to go. Switch to that branch to try an agent that provides live commentary on sports or activities you show it through your camera.

```bash
git checkout sports-commentator
```

Then follow the same setup and run steps above.

## Customization

See [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for how to:
- Change the agent's persona
- Add function calling
- Adjust video settings
- Swap voice or model

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues and solutions.

## Learn more

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [LiveKit Frontend SDKs](https://docs.livekit.io/client-sdk-js/)
