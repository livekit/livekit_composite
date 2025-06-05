# LiveKit Metrics Dashboard

This Flask application provides a dashboard for viewing metrics collected from LiveKit agents. It receives metrics data via HTTP POST requests and displays them in a real-time dashboard.

## Setup

1. Install the required dependencies:

```bash
cd metrics_server
pip install -r requirements.txt
```

2. Start the server:

```bash
python app.py
```

The server will run on `http://localhost:5001` by default.

## Usage

The metrics dashboard can be accessed at `http://localhost:5001` in your web browser. It displays metrics for LLM, STT, TTS, EOU, and VAD components.

## API Endpoints

- `POST /metrics/<metric_type>`: Submit metrics data for a specific metric type
- `GET /api/metrics`: Get all collected metrics data
- `GET /api/metrics/<metric_type>`: Get metrics data for a specific type

## Environment Variables

The LiveKit agent can be configured to send metrics to this server by setting the `METRICS_SERVER_URL` environment variable in the .env file:

```
METRICS_SERVER_URL=http://localhost:5001
``` 