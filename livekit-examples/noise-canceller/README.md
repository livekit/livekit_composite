# LiveKit Audio Noise Canceller

A command-line tool that processes audio files with the LiveKit [enhanced noise cancellation](https://docs.livekit.io/cloud/noise-cancellation/) feature. Useful for testing, verification, or offline use.

## Limitations

- **Requires LiveKit Cloud**: As noise cancellation is a feature of paid LiveKit Cloud accounts, this tool consumes real connection minutes while in use (even though it runs locally).
- **Realtime output**: This tool outputs in realtime speed, so a 5 minute audio file will take 5 minutes to process.

## Installation

1. **Install dependencies:**
```bash
uv sync
```

2. **Set up LiveKit credentials:**

Add your LiveKit Cloud credentials to `.env`:

```bash
LIVEKIT_URL="wss://your-project.livekit.cloud"
LIVEKIT_API_KEY="your-api-key"
LIVEKIT_API_SECRET="your-api-secret"
```

## Usage

### Basic Usage
```bash
# Process input.mp3 and save to output/input-processed.wav
uv run noise-canceller.py input.mp3

# Specify custom output file
uv run noise-canceller.py input.wav -o clean_audio.wav

# Use different noise cancellation filter
uv run noise-canceller.py input.flac --filter BVC

# Use WebRTC built-in noise suppression (faster, local processing)
uv run noise-canceller.py input.wav --filter WebRTC
```

### Filter Types

- **NC**: Standard enhanced noise cancellation (default)
- **BVC**: Background voice cancellation (removes background voices + noise)
- **BVCTelephony**: BVC optimized for telephony applications
- **WebRTC**: For comparison purposes, apply WebRTC built-in `noise_suppression` to the audio

## License

This tool is provided as-is under the MIT License. See [LICENSE](LICENSE) for details.