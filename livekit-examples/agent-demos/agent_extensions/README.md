# Agent Extensions

A collection of utilities and handlers for extending LiveKit agents functionality.

## Features

- Inactivity Handler: Monitors user activity and prompts after periods of silence
- Wake Word Handler: Implements wake word detection for voice assistants
- WAV Player: Utility for playing WAV files in LiveKit rooms

```
pip install -e agent_extensions
```

## Usage

### Inactivity Handler
```python
from agent_extensions.handlers import InactivityHandler

inactivity_handler = InactivityHandler(
    timeout_seconds=10,
    inactivity_message="Are you still there?"
)
inactivity_handler.start(agent)
```

### Wake Word Handler
```python
from agent_extensions.handlers import WakeWordHandler

wake_word_handler = WakeWordHandler(
    wake_word="hey assistant",
    notification_sound_path="path/to/sound.wav"
)

agent = VoicePipelineAgent(
    # ... other args ...
    before_llm_cb=wake_word_handler.before_llm_callback
)
```

### WAV Player
```python
from agent_extensions.utils import WavPlayer

wav_player = WavPlayer()
await wav_player.play_once("notification.wav", room)
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
