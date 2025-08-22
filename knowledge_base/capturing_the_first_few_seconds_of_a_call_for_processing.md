# Capturing the First Few Seconds of a Call for Processing

Sometimes you may want to capture only a short portion of audio from a call—for example, the first 5–10 seconds to pass into another audio processor. Using `RecorderIO` for this is not ideal, since it’s designed for full session recording and encoding, which can be resource-intensive and lead to memory issues for short snippets.

Instead, the recommended approach is to tap directly into the raw audio stream using `rtc. AudioStream`.


## Why NotRecorderIO?

`RecorderIO` encodes and writes the entire session audio to disk. For short in-memory buffering, it’s too heavy and can trigger memory allocation errors.

If your use case only requires a few seconds of audio, `rtc. AudioStream` is a better fit.


## Usingrtc.AudioStream

You can access raw audio frames from a participant’s track by subscribing to it and wrapping it with `AudioStream`.


### Steps:


1. **Listen for a new track**Use the `on_track_subscribed` event inside your agent to detect when an audio track is published.
2. **Wrap the track with**`rtc. AudioStream`This gives you a stream of `AudioFrame` objects.
3. **Buffer the audio frames**Collect frames until you have the desired duration (e. g., 7 seconds).
4. **Convert to WAV**Use `combine_audio_frames(...)` to stitch the frames together, then `AudioFrame. to_wav_bytes()` to turn them into a short WAV blob you can send to your other audio processor.


### Example


```
from livekit import rtc
from livekit.agents import AudioStream, combine_audio_frames

buffer = []

async def on_track_subscribed(track: rtc.Track, *_):
    if track.kind == rtc.TrackKind.KIND_AUDIO:
        stream = rtc.AudioStream(track)

        async for frame in stream:
            buffer.append(frame)

            # Stop after ~7s worth of audio
            if frame.timestamp > 7_000:  
                break

        # Combine frames and export as WAV bytes
        combined = combine_audio_frames(buffer)
        wav_bytes = combined.to_wav_bytes()

        # Send wav_bytes to another function
```


## Key Points


- Use `on_track_subscribed` to hook into track creation directly inside your agent (no need for webhooks if you want to keep logic local).
- `AudioStream` is lightweight and avoids the memory overhead of `RecorderIO`.
- You have full control over buffering and processing in memory before exporting to a WAV blob.

✅ **Best for:** Short audio snippets, preprocessing, and integrations with external systems.❌ **Not for:** Full-session archival recordings (use `RecorderIO` for that).