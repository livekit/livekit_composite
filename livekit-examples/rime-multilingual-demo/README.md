# Rime Multilingual Demo

A full-stack voice agent application that demonstrates seamless language switching using LiveKit Agents and Rime TTS. This project includes both a React frontend and a Python backend agent that can detect and respond in multiple languages during a conversation.

## Supported languages

This demo includes four languages:

- 🇺🇸 English
- 🇪🇸 Spanish  
- 🇫🇷 French
- 🇩🇪 German

Rime Arcana supports 11 languages in total.

## Project structure

This is a monorepo containing two main components:

```
rime-multilingual-demo/
├── frontend/          # Next.js React application with Agents UI
└── backend/           # Python LiveKit agent with multilingual support
```

### Frontend

The frontend is built with Next.js and provides a voice interface for interacting with the LiveKit agent. It includes features like:

- Real-time voice interaction
- Audio visualization
- Light/dark theme support
- Chat transcript display

See the [frontend README](./frontend/README.md) for setup instructions and detailed documentation.

### Backend

The backend is a Python-based LiveKit agent that handles:

- Speech-to-text with Deepgram (multi-language mode)
- Language detection and dynamic TTS switching
- Language model responses with OpenAI
- Text-to-speech with Rime (language-matched voices)

See the [backend README](./backend/README.md) for setup instructions and detailed documentation.

## Getting started

Both the frontend and backend need to be running for the application to work.

### Quick start

1. Set up the backend agent:
   ```bash
   cd backend
   # Follow the setup instructions in backend/README.md
   ```

2. Set up the frontend:
   ```bash
   cd frontend
   # Follow the setup instructions in frontend/README.md
   ```

3. Run both applications:
   - Start the backend agent in one terminal
   - Start the frontend development server in another terminal

### Required API keys

You'll need accounts and API keys for:

- [LiveKit Cloud](https://cloud.livekit.io/)
- [Rime](https://app.rime.ai/)
- [Deepgram](https://console.deepgram.com/)
- [OpenAI](https://platform.openai.com/)

Refer to the individual README files in each directory for specific configuration details.

## How it works

The agent intercepts speech-to-text events to detect the language being spoken, then dynamically updates the Rime TTS parameters to respond in the same language. This creates a natural multilingual conversation experience where the agent mirrors the user's language choice.

```
User speaks (any language) → Deepgram STT → Language Detection → 
OpenAI LLM → Rime TTS (matched language) → User hears response
```

## License

MIT License - see [LICENSE](./LICENSE) for details.
