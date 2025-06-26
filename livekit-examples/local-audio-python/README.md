# Python Local Audio Device Example

A bidirectional audio streaming example using local microphone and audio output devices with the LiveKit [Python SDK](https://github.com/livekit/python-sdks). Features real-time audio processing with echo cancellation, dB level meters, and mute controls.

## Features

- **Bidirectional Audio**: Send microphone audio and receive audio from other participants
- **Echo Cancellation**: Built-in Acoustic Echo Cancellation (AEC) 
- **Real-time Meters**: Visual dB level meters for local microphone and remote participants
- **Mute Control**: Toggle microphone mute with keyboard shortcut (M key)
- **Live UI**: Real-time terminal interface showing audio levels and connection stats
- **Device Selection**: Automatic audio device detection and configuration

## Dev Setup

### Install uv (Python Package Manager)

First, install [uv](https://docs.astral.sh/uv/), a fast Python package manager:

**macOS/Linux:**
```console
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows:**
```console
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Alternative (using pip):**
```console
pip install uv
```

### Clone and Setup Environment

Clone the repository and set up the environment:

```console
cd local-audio-python
```

The script uses uv's inline script dependencies, so no additional setup is required. Dependencies are automatically managed by the script.

### Configure Environment

Set up the environment by copying `.env.example` to `.env` and filling in the required values:

- `LIVEKIT_URL` - Your LiveKit server URL
- `LIVEKIT_API_KEY` - Your LiveKit API key  
- `LIVEKIT_API_SECRET` - Your LiveKit API secret
- `ROOM_NAME` - Room name to join

## Usage

### Basic Usage

Run the audio streamer with default settings:

```console
uv run stream_audio.py
```

### Command Line Options

The script supports several command line options:

```console
# Specify participant name
uv run stream_audio.py --name "Your Name"

# Disable echo cancellation
uv run stream_audio.py --disable-aec

# Enable debug logging
uv run stream_audio.py --debug

# Combine options
uv run stream_audio.py --name "Alice" --debug
```

### Interactive Controls

Once running, use these keyboard controls:

- **M** - Toggle microphone mute/unmute
- **Q** - Quit the application
- **Ctrl+C** - Force quit

### Audio Requirements

- **Use headphones** to avoid audio feedback between speakers and microphone
- The application automatically detects and configures audio devices
- Supports 48kHz sample rate with mono audio for optimal quality

## UI Display

The terminal interface shows:

- **Local Microphone**: Live/muted status with dB level meter
- **Remote Participants**: List of connected participants with their audio levels
- **Statistics**: Connection stats, frame counts, and queue status
- **Controls**: Available keyboard shortcuts

## Troubleshooting

### Audio Device Discover

If you encounter audio device problems:

1. **List available devices**:
   ```console
   uv run list_devices.py
   ```
