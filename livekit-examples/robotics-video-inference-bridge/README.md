<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# LiveKit Robotics: Video Inference Bridge

Real-time cloud inference transport for computer vision using [LiveKit](https://livekit.io/). Stream video from edge devices to the cloud for YOLO object detection, receiving bounding box results in real-time.

## Architecture

```
┌─────────────────┐                           ┌─────────────────┐
│   Edge Client   │                           │ Cloud Processor │
│  (Python/ESP32) │──── H.264 Video ────────▶│   (YOLO11)      │
│                 │◀─── Bounding Boxes ──────│                 │
└─────────────────┘         LiveKit           └─────────────────┘
```

## Components

| Component                                       | Description                       |
| ----------------------------------------------- | --------------------------------- |
| [cloud-processor](./cloud-processor/)           | YOLO11 inference on video streams |
| [edge-client](./edge-client/)                   | Python webcam client              |
| [edge-embedded-client](./edge-embedded-client/) | ESP32-P4 camera client            |

## Prerequisites

- [LiveKit Cloud](https://cloud.livekit.io/) account (or self-hosted LiveKit server)
- [uv](https://github.com/astral-sh/uv) — Python package management
- [ESP-IDF](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/) v5.4+ — ESP32 development (optional)

## Quick Start

### 1. Get LiveKit credentials

Create a project at [LiveKit Cloud](https://cloud.livekit.io/) and copy your API key and secret.

### 2. Configure environment

```sh
# Cloud processor
cd cloud-processor
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Edge client
cd ../edge-client
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### 3. Run

```sh
# Terminal 1: Start cloud processor
cd cloud-processor && uv sync
uv run python main.py

# Terminal 2: Start edge client
cd edge-client && uv sync
uv run python main.py
```

## Environment Variables

| Variable             | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `LIVEKIT_URL`        | LiveKit server URL (e.g., `wss://your-project.livekit.cloud`) |
| `LIVEKIT_API_KEY`    | API key from LiveKit Cloud                                    |
| `LIVEKIT_API_SECRET` | API secret from LiveKit Cloud                                 |
| `LIVEKIT_ROOM`       | Room name (default: `edge-cv`)                                |

## Bounding Box Format

Detections are published on the `bounding_boxes` topic:

```json
{
  "timestamp": 1234567890.123,
  "frame_width": 640,
  "frame_height": 480,
  "boxes": [
    {
      "class": "person",
      "confidence": 0.95,
      "x1": 0.1,
      "y1": 0.2,
      "x2": 0.5,
      "y2": 0.8
    }
  ]
}
```

- `class`: Object class name (e.g., "person", "car", "dog")
- `confidence`: Detection confidence (0.0–1.0)
- `x1`, `y1`, `x2`, `y2`: Bounding box coordinates, normalized (0.0–1.0)

## Resources

- [LiveKit Docs](https://docs.livekit.io/)
- [LiveKit ESP32 SDK](https://github.com/livekit/client-sdk-esp32)
- [Ultralytics YOLO](https://docs.ultralytics.com/)
