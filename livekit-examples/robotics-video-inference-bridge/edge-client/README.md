# Edge Client

Python client that captures video from a webcam and streams it to the cloud processor via [LiveKit](https://livekit.io/). Receives and displays bounding box detections in real-time.

## Features

- Captures 640x480 video from webcam
- Streams RGB24 frames via LiveKit
- Receives bounding box detections on `bounding_boxes` topic
- Prints detection results to console

## Requirements

- Python 3.10+
- [uv](https://github.com/astral-sh/uv)
- Webcam (or video device at `/dev/video0`)

## Setup

```sh
# Install dependencies
uv sync

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your LiveKit credentials
```

## Usage

```sh
uv run python main.py
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_URL` | Yes | LiveKit server URL (e.g., `wss://your-project.livekit.cloud`) |
| `LIVEKIT_API_KEY` | Yes | API key from LiveKit Cloud |
| `LIVEKIT_API_SECRET` | Yes | API secret from LiveKit Cloud |
| `LIVEKIT_ROOM` | No | Room name (default: `edge-cv`) |

## Output

When the cloud processor detects objects, the client prints:

```
Detected 2 object(s):
  [0] person conf=0.95 x1=0.100 y1=0.200 x2=0.500 y2=0.800
  [1] dog conf=0.87 x1=0.600 y1=0.150 x2=0.900 y2=0.850
```

## Configuration

| Setting  | Default | Description  |
| -------- | ------- | ------------ |
| `WIDTH`  | 640     | Video width  |
| `HEIGHT` | 480     | Video height |
