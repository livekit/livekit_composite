# Stereo Video Demo

Basic example of streaming video from a stereoscopic camera to Meta Quest using LiveKit.

> [!IMPORTANT]
> This repository contains large files stored with Git LFS; ensure Git LFS is installed on your system prior to cloning the repository.

## Stereo Viewer

This repository includes a minimal stereo viewer application for Meta Quest built with the [Spatial SDK](https://developers.meta.com/horizon/develop/spatial-sdk). To get started:
1. Open project root in Android Studio ([*LiveKitStereoViewer/*](/LiveKitStereoViewer/))
2. Set `LK_SERVER` and `LK_TOKEN` in  [*ImmersiveActivity.kt*](/LiveKitStereoViewer/app/src/main/java/io/livekit/LiveKitStereoViewer/ImmersiveActivity.kt).
3. Build and run on device

When run, a viewer panel will appear in the immersive environment. Once a stereoscopic video track is published by a remote participant, it will be displayed on the panel. See the following section for setting up ingress to get a video to display.

## Video Source

Currently, the viewer expects to receive a side-by-side video stream with a resolution of 3840x1080 (1920x1080 per eye)—this example will be updated in the future to demonstrate dynamic configuration and additional formats.

### Camera Input

LiveKit supports ingestion of external live streams using [Ingress](https://docs.livekit.io/home/ingress/overview/). Please refer to the [Rover Teleop](https://github.com/livekit-examples/rover-teleop) demo for a concrete example of ingesting live camera input.

### Static Video

For testing purposes, you can ingest a stereoscopic video from a static file instead of from a live camera feed. With the [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup/) installed on your system, run the following command:

```sh
export LIVEKIT_URL=<your LiveKit server URL>
export LIVEKIT_API_KEY=<your API Key>
export LIVEKIT_API_SECRET=<your API Secret>

lk room join --publish h264://drive.google.com/uc?id=1ENQQrTUcCqcP5xrDz6PjRwfq-_qHLetx stereo-demo
```

If using your own file, please note:

- It will need to be hosted publicly on an HTTP server (see below).
- If it is encoded with VP8 instead of h264, use the `vp8://` scheme instead.

### Quick hosting

The video file needs to be served from an HTTP server with the proper MIME type set in order for ingress to work. For quick testing, the file can be hosted on Google Drive using this procedure:

1. Upload video to Google Drive
2. Share the video, set access to "Anyone with link". Copy the share URL
3. The share URL will have the following format: `https://drive.google.com/file/d/<id>/view?usp=sharing`. Using the file's ID, rewrite the URL as follows: `https://drive.google.com/uc?id=<id>` for direct access.