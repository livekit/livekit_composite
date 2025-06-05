# Python Local Audio Device Example

A basic example of using local microphone and audio output devices using the LiveKit [Python SDK](https://github.com/livekit/python-sdks).

## Dev Setup

Clone the repository and install dependencies to a virtual environment:

```console
cd local-audio-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Set up the environment by copying `.env.example` to `.env` and filling in the required values:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `ROOM_NAME`

Run the audio publisher:

```console
python3 send_audio.py
```

Run the audio receiver:

```console
python3 receive_audio.py
```

Please use headphones to avoid audio feedback.  You should be able to speak into the mic and hear the audio played back through the speakers.