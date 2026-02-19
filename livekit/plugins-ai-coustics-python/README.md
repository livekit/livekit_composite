# Ai-coustics Audio Enhancement Plugin for Python

Python [LiveKit](https://livekit.io) plugin for [Ai-coustics](https://ai-coustics.com) audio enhancement, providing real-time noise filtering and audio quality improvement for LiveKit audio streams.

## Installation

```bash
pip install livekit-plugins-ai-coustics
```

Or using `uv`:

```bash
uv add livekit-plugins-ai-coustics
```

## Requirements

- Python >= 3.9
- livekit >= 0.21.4

## Usage

### LiveKit Agents Framework

The plugin integrates seamlessly with the LiveKit Agents framework by providing an audio enhancement processor that can be configured on the RoomIO:

```python
from livekit.agents import RoomIO
from livekit.plugins import ai_coustics

async def entrypoint(ctx: JobContext):
    await ctx.connect()

    # Configure RoomIO with AI-coustics noise cancellation
    room_io = RoomIO(
        # Available enhancement models:
        # - EnhancerModel.QUAIL_L      (default, best for voice enhancement)
        # - EnhancerModel.QUAIL_STT_VOICE_FOCUS   (higher quality, extra cost)
        noise_cancellation=ai_coustics.audio_enhancement(
            model=EnhancerModel.QUAIL_L, # default, can be omitted
        )
    )

    # Use the room_io for your agent tasks
    ...
```
