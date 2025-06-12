# Resolving "InvalidState - failed to capture frame" errors in AudioSource

When working with LiveKit's AudioSource for streaming custom audio frames, you may occasionally encounter the error "RtcError: InvalidState - failed to capture frame". This typically occurs when the internal audio frame queue becomes overloaded.


## Solution

To resolve this issue, increase the queue size when creating your AudioSource by setting the `queue_size_ms` parameter:


```
audio_source = rtc.AudioSource(
    sample_rate=sample_rate,
    num_channels=channels,
    queue_size_ms=2000  # Increase this value from the default
)
```


## Understanding queue_size_ms

The `queue_size_ms` parameter controls how much audio data can be buffered before processing. The minimum allowed value is 10ms, but using a larger value (like 2000ms) provides more buffer room and helps prevent frame capture failures.


> **Note:** If you're experiencing frequent frame capture failures, try gradually increasing the queue_size_ms until the errors stop occurring.


## Best Practices


- Start with a larger queue size (1000-2000ms) if you're processing audio streams continuously
- Monitor the frequency of frame capture failures in your application logs
- Keep your LiveKit SDK version up to date