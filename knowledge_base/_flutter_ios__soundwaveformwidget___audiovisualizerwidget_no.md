# [Flutter iOS] SoundWaveformWidget / AudioVisualizerWidget Not Working (MissingPluginException)

# Overview

Some Flutter developers using the **LiveKit Flutter SDK** have reported an issue where the AudioVisualizerWidget (specifically SoundWaveformWidget) works fine on **Android**, but fails on **iOS**. The error typically looks like this:


```
MissingPluginException(No implementation found for method listen on channel io.livekit.audio.visualizer/eventChannel-XXXX)
```

This indicates that Flutter is unable to find the native iOS implementation for the event channel used by the audio visualizer.


## Symptoms


- The waveform visualization does not appear on iOS.
- Android builds function correctly.
- Error appears in logs when enabling microphone:


```
MissingPluginException(No implementation found for method listen on channel io.livekit.audio.visualizer/eventChannel-TR_abc123)
```


## Root Cause

This issue was traced to a **conflict with the flutter_background_service plugin**.

On iOS, this plugin interferes with event channel handling when its service is initialized. As a result, LiveKit’s audio visualizer event channel cannot properly register its listener, leading to the MissingPluginException.


## Steps Attempted (but not root cause)

Users initially tried:


- Checking LiveKit plugin registration in AppDelegate. swift
- Ensuring microphone permissions (NSMicrophoneUsageDescription) in Info. plist
- Cleaning/rebuilding Flutter project (flutter clean && flutter pub get)
- Upgrading LiveKit dependencies

These steps did not resolve the problem, as the conflict originated from another plugin.


## Solution

The problem was resolved by adjusting how the **flutter_background_service** plugin is initialized.

Specifically, its initializeService() call was causing interference:


```
Future<void> initializeService() async {
  final service = FlutterBackgroundService();

  await service.configure(
    iosConfiguration: IosConfiguration(
      autoStart: true,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
    androidConfiguration: AndroidConfiguration(
      autoStart: true,
      onStart: onStart,
      isForegroundMode: false,
      autoStartOnBoot: true,
    ),
  );
}
```


### Workarounds:


1. **Disable or remove flutter_background_service** if it’s not required.

**Modify service configuration** so that iOS background handling does not conflict with LiveKit’s audio visualizer.


- For example, try removing or adjusting the onBackground handler in IosConfiguration.


1. **Initialize flutter_background_service only when needed** rather than at app startup.

After these changes, the audio visualizer began working correctly on iOS.


## Recommendations


- If you need both LiveKit’s audio visualizer and background services in the same Flutter app, test carefully on iOS to ensure compatibility.
- When encountering MissingPluginException, check for **other plugins** that register or override event channels.
- Keep LiveKit Flutter SDK and related dependencies updated to the latest versions for the most stable interop.


## References


- [LiveKit Flutter SDK](https://github. com/livekit/client-sdk-flutter)
- [flutter_background_service package](https://pub. dev/packages/flutter_background_service)
- Reported case: LiveKit Community (2025-08)