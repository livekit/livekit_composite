# Understanding "silence detected on local audio track" warning

When using a microphone in LiveKit, you may encounter a `silence detected on local audio track` warning message in the browser console. This article explains what this warning means and when you might see it.


## When does this warning appear?

This warning appears shortly after publishing a local microphone track.


## What causes this warning?

LiveKit's Javascript client SDK tries to determine if the selected microphone is functioning. It does this by listening to the audio track for a short period after the track is first published. And, if, during this time, no audio was detected, it produces this warning message.

Noise suppression (including builtin noise suppression included with devices like Apple's EarPods) can unfortunately lead to false positives. This is especially true because most participants do not immediately begin talking after publishing.

So, while this message was intended to catch hardware issues, it is more common that software noise suppression is the real cause.


## How is this implemented?

The implementation is straightforward: a `detectSilence()` [method](https://github. com/livekit/client-sdk-js/blob/main/src/room/track/utils. ts#L108-L126) is triggered when the [microphone is published](https://github. com/livekit/client-sdk-js/blob/d7fe4c63d8b0636174044ebe0fda693bd9b63473/src/room/Room. ts#L2366-L2371). It looks at the audio signal for a short time frame and [emits this warning](https://github. com/livekit/client-sdk-js/blob/main/src/room/track/LocalAudioTrack. ts#L243-L253) if all audio samples had a volume equal to 0.


> **Note:** If audio functions normally after the initial warning, there's no cause for concern. The warning is simply LiveKit's attempt to detect potential audio input issues early in the connection process.