<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# LiveKit Agents Starter - Python

A complete starter project for building voice AI apps with [LiveKit Agents for Python](https://github.com/livekit/agents).

The starter project includes:

- A simple voice AI assistant based on the [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/)
- Voice AI pipeline based on [OpenAI](https://docs.livekit.io/agents/integrations/llm/openai/), [Cartesia](https://docs.livekit.io/agents/integrations/tts/cartesia/), and [Deepgram](https://docs.livekit.io/agents/integrations/llm/deepgram/)
  - Easily integrate your preferred [LLM](https://docs.livekit.io/agents/integrations/llm/), [STT](https://docs.livekit.io/agents/integrations/stt/), and [TTS](https://docs.livekit.io/agents/integrations/tts/) instead, or swap to a realtime model like the [OpenAI Realtime API](https://docs.livekit.io/agents/integrations/realtime/openai)
- Eval suite based on the LiveKit Agents [testing & evaluation framework](https://docs.livekit.io/agents/build/testing/)
- [LiveKit Turn Detector](https://docs.livekit.io/agents/build/turns/turn-detector/) for contextually-aware speaker detection, with multilingual support
- [LiveKit Cloud enhanced noise cancellation](https://docs.livekit.io/home/cloud/noise-cancellation/)
- Integrated [metrics and logging](https://docs.livekit.io/agents/build/metrics/)

This starter app is compatible with any [custom web/mobile frontend](https://docs.livekit.io/agents/start/frontend/) or [SIP-based telephony](https://docs.livekit.io/agents/start/telephony/).

## Dev Setup

Clone the repository and install dependencies to a virtual environment:

```console
cd agent-starter-python
uv sync
```

Set up the environment by copying `.env.example` to `.env` and filling in the required values:

- `LIVEKIT_URL`: Use [LiveKit Cloud](https://cloud.livekit.io/) or [run your own](https://docs.livekit.io/home/self-hosting/)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`: [Get a key](https://platform.openai.com/api-keys) or use your [preferred LLM provider](https://docs.livekit.io/agents/integrations/llm/)
- `DEEPGRAM_API_KEY`: [Get a key](https://console.deepgram.com/) or use your [preferred STT provider](https://docs.livekit.io/agents/integrations/stt/)
- `CARTESIA_API_KEY`: [Get a key](https://play.cartesia.ai/keys) or use your [preferred TTS provider](https://docs.livekit.io/agents/integrations/tts/)

You can load the LiveKit environment automatically using the [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup):

```bash
lk app env -w .env
```

## Run the agent

Before your first run, you must download certain models such as [Silero VAD](https://docs.livekit.io/agents/build/turns/vad/) and the [LiveKit turn detector](https://docs.livekit.io/agents/build/turns/turn-detector/):

```console
uv run python src/agent.py download-files
```

Next, run this command to speak to your agent directly in your terminal:

```console
uv run python src/agent.py console
```

To run the agent for use with a frontend or telephony, use the `dev` command:

```console
uv run python src/agent.py dev
```

In production, use the `start` command:

```console
uv run python src/agent.py start
```

## Web and mobile frontends

To use a prebuilt frontend or build your own, see the [agents frontend guide](https://docs.livekit.io/agents/start/frontend/).

## Telephony

To add a phone number, see the [agents telephony guide](https://docs.livekit.io/agents/start/telephony/).

## Tests and evals

This project includes a complete suite of evals, based on the LiveKit Agents [testing & evaluation framework](https://docs.livekit.io/agents/build/testing/). To run them, use `pytest`.

```console
uv run pytest evals
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.