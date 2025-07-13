# Configuring the Client SDK for Optimal Video Quality

To get the best video quality when capturing and streaming video with the LiveKit [Javascript Client SDK](https://github. com/livekit/client-sdk-js), it's important to correctly configure a few key parameters. This guide will help you understand which options affect quality, and how to balance resolution, bandwidth, and compatibility.


## 1. Select the Right Video Codec

We recommend **VP9** if your use case prioritizes visual quality. VP9 offers better perceptual quality at the same bitrate compared to VP8, which can be particularly beneficial on constrained networks.


- **Pros:** Better quality at similar bandwidth.
- **Cons:** Higher CPU usage for both encoding and decoding.
- **Compatibility:** VP9 is [well supported in modern browsers](https://livekit. io/webrtc/codecs-guide).

If you choose to use **VP9**(or**AV1**), the simulcast behavior described below will change:


- VP9 (and AV1) uses **SVC**(Scalable Video Coding)
- Simulcast settings (`videoSimulcastLayers`) are not used with VP9. Additional layers are instead configured via the `scalabilityMode` [property](https://docs. livekit. io/reference/client-sdk-js/interfaces/TrackPublishOptions. html#scalabilitymode) ( [allowed values](https://docs. livekit. io/reference/client-sdk-js/types/ScalabilityMode. html)). Spatial layers (Lx) correspond to resolutions. Temporal layers (Tx) correspond to frame rates.
- Clients do not have direct control over the exact resolutions and frame rates of each layer; the browser determines the optimal configuration.

We recommend H264 in situations where you have limited CPU as the encoding and decoding are typically done in hardware.


## 2. ConfigureVideoCaptureOptionsfor Camera Resolution

`VideoCaptureOptions` lets you request a specific resolution and frame rate from the user's camera.


### Key Fields:


- `resolution`: Suggest the **highest quality resolution** you want from the camera.
- `frameRate`: Optional — the browser and device may limit or adjust this.

📌 *This setting determines the original source video stream from the camera. Simulcast layers are derived from this base layer.*


## 3. UsevideoSimulcastLayersandscreenshareSimulcastLayersto Enable Adaptive Quality

Simulcast allows LiveKit to send multiple resolutions of a video stream. This helps optimize for varying network and device conditions.


- You can define up to **two** simulcast layers.
- LiveKit will **always include the original (full resolution) layer** from `VideoCaptureOptions` and `screenshareSimulcastLayers` automatically.

Use the [videoSimulcastLayers](https://docs. livekit. io/reference/client-sdk-js/interfaces/TrackPublishOptions. html#videosimulcastlayers) and [screenshareSimulcastLayers](https://docs. livekit. io/reference/client-sdk-js/interfaces/TrackPublishOptions. html#screensharesimulcastlayers) property to set the additional layers from the pre-defined [VideoPresets](https://docs. livekit. io/reference/client-sdk-js/variables/VideoPresets. html).

📌 **Important:** Simulcast layers are *additional* to the base capture resolution.


## 4. Enable Dynacast

We recommend enabling `dynacast` to optimize bandwidth usage.


- Dynamically disables unused simulcast layers based on which subscribers are viewing them.
- Helps reduce unnecessary upstream bandwidth consumption.


## 5. ConfigurevideoEncoding

You can also configure the [video encoding parameters](https://docs. livekit. io/reference/client-sdk-js/interfaces/VideoEncoding. html) for the camera track via the [videoEncoding property](https://docs. livekit. io/reference/client-sdk-js/interfaces/TrackPublishOptions. html#videoencoding).


- For best and easiest experience, use the [values](https://docs. livekit. io/reference/client-sdk-js/classes/VideoPreset. html) provided by the predefined [VideoPresets](https://docs. livekit. io/reference/client-sdk-js/variables/VideoPresets. html)
- If you manually configure these values, consult [this guide](https://livekit. io/webrtc/bitrate-guide) for common configurations.


## Putting it all together

You can configure these settings in either:


- [RoomOptions. publishDefaults](https://docs. livekit. io/reference/client-sdk-js/interfaces/RoomOptions. html#publishdefaults)

or


- [options](https://docs. livekit. io/reference/client-sdk-js/interfaces/TrackPublishOptions. html) passed to [LocalParticipant. publishTrack()](https://docs. livekit. io/reference/client-sdk-js/classes/LocalParticipant. html#publishtrack)


### Example


### Example with VP9 codec