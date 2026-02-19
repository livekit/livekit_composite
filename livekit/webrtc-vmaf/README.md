# WebRTC VMAF Analysis Tool

This tool is designed to perform [VMAF analysis](https://github.com/Netflix/vmaf) for WebRTC video codecs.

WebRTC video, due to its real-time requirements, is often less efficient compared to the encoder's full potential. Part of the reason is due to the limited number of frames that can be kept in the encoder's frame buffer. As a result, when video is encoded with a low-latency profile, it tends to forgo some bitrate efficiency compared to the maximum capabilities of the codecs.

This presents a dilemma for WebRTC application developers: what bitrates should be used to ensure high-quality encoding?

`webrtc-vmaf` is a python script that answers that question:

- takes in a source video, and encodes it using a real-time profile, similar to settings used in WebRTC
- computes VMAF score comparing the encoded version to the original input
- performs resizing and framerate adjustments dynamically
- supports all video codecs used in WebRTC: H.264, H.265, VP8, VP9, and AV1

## Installation

Requires Python 3 and FFMPEG to be installed

```
git clone https://github.com/livekit/webrtc-vmaf.git
```

## Usage

### Computing VMAF for a single input

```
% ./webrtc-vmaf.py --bitrate 1500 --width 1280 --height 720 --codec vp9 <input_video>
computing VMAF for vp9 at 1500
  FourPeople_1280x720_60.webm: 92.25438 	fps: 281
VMAF: 92.25438 	fps: 281
```

### Computing VMAF for multiple input files

If multiple files are given, it would also generate an average VMAF score for the different inputs.

```
% ./webrtc-vmaf.py --bitrate 1500 --width 1280 --height 720 --codec av1 <input_video1> <input_video2> <input_video3>
```

### Comparing different bitrates

You can also pass in multiple bitrate flags for it to compute VMAF scores for them separately

```
% ./webrtc-vmaf.py --bitrate 1200 --bitrate 1300 --bitrate 1400 \
  --width 1280 --height 720 \
  --codec av1 <input_video>
```

### Using example clips

`download_files.sh` will download about 10GB of source clips from xiph.org. The clips are organized
into four categories:

- video conferencing
- sports
- gaming
- natural
