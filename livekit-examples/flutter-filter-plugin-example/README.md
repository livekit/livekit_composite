# flutter-filter-plugin-example

## Usage

1, register a filter to the livekit room.

```dart

  final _videoFilter = LivekitVideoFilter();
  final _audioFilter = LivekitAudioFilter();

  _room = Room(
      roomOptions: RoomOptions(
        defaultAudioCaptureOptions: AudioCaptureOptions(
          processor: _audioFilter,
        ),
        defaultCameraCaptureOptions: CameraCaptureOptions(
          processor: _videoFilter,
        ),
      ),
    );

    await _room!.connect(url, token);
```

2, add your audio/video processing code here

Android [Audio Track](https://github.com/livekit-examples/flutter-filter-plugin-example/blob/main/android/src/main/kotlin/io/livekit/flutter/fliters/example/livekit_filter_plugin_example/AudioFilter.kt#L21) [Video Track](https://github.com/livekit-examples/flutter-filter-plugin-example/blob/main/android/src/main/kotlin/io/livekit/flutter/fliters/example/livekit_filter_plugin_example/VideoFilter.kt#L10)

iOS/macOS [Audio Track](https://github.com/livekit-examples/flutter-filter-plugin-example/blob/main/shared_swift/AudioFilter.swift#L12) [Video Track](https://github.com/livekit-examples/flutter-filter-plugin-example/blob/main/shared_swift/VideoFilter.swift#L6)
