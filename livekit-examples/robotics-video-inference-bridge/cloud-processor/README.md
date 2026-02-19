# Cloud Processor

Subscribes to video streams from edge clients via [LiveKit](https://livekit.io/), runs YOLO11 object detection, and publishes bounding box results back to the room.

## Features

- Receives H.264 video streams from edge clients
- Runs YOLO11 inference at 10 FPS
- Detects all 80 COCO classes (person, car, dog, etc.)
- Publishes detections on `bounding_boxes` topic
- Normalized coordinates for resolution-independent results

## Requirements

- Python 3.10+
- [uv](https://github.com/astral-sh/uv)
- GPU recommended for inference

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

## Output Format

Bounding boxes are published as JSON on the `bounding_boxes` topic:

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
- `x1`, `y1`: Top-left corner (normalized)
- `x2`, `y2`: Bottom-right corner (normalized)

## Configuration

| Setting      | Default | Description                  |
| ------------ | ------- | ---------------------------- |
| `TARGET_FPS` | 10      | Inference rate               |
| `conf`       | 0.5     | Minimum detection confidence |
| `imgsz`      | 640     | YOLO input size              |
