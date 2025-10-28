# Voice Agent Hackathon Template

Welcome to the Voice Agent Hackathon! This template contains a ready-to-use voice agent built [LiveKit Agents](https://github.com/livekit/agents). All you need is a [LiveKit Cloud](https://cloud.livekit.io) project.

This starter app is compatible with any [custom web/mobile frontend](https://docs.livekit.io/agents/start/frontend/) or [SIP-based telephony](https://docs.livekit.io/agents/start/telephony/).

## Setup

Step 1: Copy this repository (Click the green "Use this template" button on GitHub)  
Step 2: Clone your new copy to your local machine  
Step 3: Install dependencies using uv ([install uv here](https://docs.astral.sh/uv/getting-started/installation/) if needed)  

```shell
cd voice-agent-hackathon
uv sync
```

Step 4: Set up the environment by copying `.env.example` to `.env.local` and filling in the required values from your [LiveKit Cloud](https://cloud.livekit.io) project

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

You can load the LiveKit environment automatically using the [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup):

```bash
lk cloud auth
lk app env -w -d .env.local
```

## Run the agent

Before your first run, you must download certain models such as [Silero VAD](https://docs.livekit.io/agents/build/turns/vad/) and the [LiveKit turn detector](https://docs.livekit.io/agents/build/turns/turn-detector/):

```shell
uv run python src/agent.py download-files
```

Next, run this command to start the agent:

```shell
uv run python src/agent.py dev
```

Finally, open the [LiveKit Agents Playground](https://agents-playground.livekit.io/#cam=0&mic=1&screen=0&video=0&audio=1&chat=1&theme_color=cyan) to speak with your new agent!

## Tips for managing background noise

If you're in a noisy hackathon environment, it may be tricky to test your agent. Here are some tips to help you:

1. Use headphones with a microphone and noise isolation features (such as AirPods Pro) 
2. Use the LiveKit [background voice cancellation](https://docs.livekit.io/home/cloud/noise-cancellation/) model (pre-installed in this template)
3. Turn off your microphone in the [Agents Playground](https://agents-playground.livekit.io/#cam=0&mic=1&screen=0&video=0&audio=1&chat=1&theme_color=cyan) and use text input to test your agent instead.

## Custom frontend & telephony

Get started quickly with our pre-built frontend starter apps, or add telephony support:

| Platform | Link | Description |
|----------|----------|-------------|
| **Web** | [`livekit-examples/agent-starter-react`](https://github.com/livekit-examples/agent-starter-react) | Web voice AI assistant with React & Next.js |
| **iOS/macOS** | [`livekit-examples/agent-starter-swift`](https://github.com/livekit-examples/agent-starter-swift) | Native iOS, macOS, and visionOS voice AI assistant |
| **Flutter** | [`livekit-examples/agent-starter-flutter`](https://github.com/livekit-examples/agent-starter-flutter) | Cross-platform voice AI assistant app |
| **React Native** | [`livekit-examples/agent-starter-react-native`](https://github.com/livekit-examples/agent-starter-react-native) | Native mobile app with React Native & Expo |
| **Android** | [`livekit-examples/agent-starter-android`](https://github.com/livekit-examples/agent-starter-android) | Native Android app with Kotlin & Jetpack Compose |
| **Web Embed** | [`livekit-examples/agent-starter-embed`](https://github.com/livekit-examples/agent-starter-embed) | Voice AI widget for any website |
| **Telephony** | [📚 Documentation](https://docs.livekit.io/agents/start/telephony/) | Add inbound or outbound calling to your agent |

For advanced customization, see the [complete frontend guide](https://docs.livekit.io/agents/start/frontend/).

## Tests and evals

This project includes a complete suite of evals, based on the LiveKit Agents [testing & evaluation framework](https://docs.livekit.io/agents/build/testing/). To run them, use `pytest`.

```shell
uv run pytest
```

To run the tests in a CI environment, you must also [add repository secrets](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/using-secrets-in-github-actions) for `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.

## Deploying to production

This project is production-ready and includes a working `Dockerfile`. To deploy it to LiveKit Cloud or another environment, see the [deploying to production](https://docs.livekit.io/agents/ops/deployment/) guide.

## Models

This project uses LiveKit Inference with models from AssemblyAI, OpenAI, and Cartesia. No extra account is required to use these models, which have been selected for their quality and performance.

Many more models are available, both through LiveKit Inference and through SDK plugins for a wide variety of third-party APIs. See the [LiveKit Agents documentation](https://docs.livekit.io/agents/models/) for a full list.

Happy hacking!