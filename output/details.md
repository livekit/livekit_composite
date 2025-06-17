# Detailed Summary

## Server/Core

- **Key functional changes**
  - Updated the logic in `updateRidsFromSDP` method in `ParticipantImpl` to handle simulcast Rids based on the SDP information.
  - Added logging for out-of-order reliable data packet reception in `handleReceivedDataMessage` method.
  - Modified the processing of video layers in the `mediaTrackReceived` method.

- **Important code modifications**
  - Removed the initial check for `rids` and moved it inside the `if ok` block in `updateRidsFromSDP`.
  - Refactored the loop for updating `pti.sdpRids` based on the length of `rids` and `pti.sdpRids`.
  - Added logging for tracking pending track Rids update in `updateRidsFromSDP`.
  - Added logging for receiving out-of-order reliable data packets in `handleReceivedDataMessage`.
  - Refactored the processing of video layers in `mediaTrackReceived` to set `SpatialLayer` and `Rid` for each layer.

- **New features or fixes**
  - Improved handling of simulcast Rids in `updateRidsFromSDP` to ensure correct assignment based on SDP information.
  - Enhanced logging for tracking updates related to pending track Rids and out-of-order reliable data packet reception.

- **Breaking changes or API updates**
  - No apparent breaking changes or API updates based on the provided diff.

## Client

- **Key functional changes**
  - Updated the `VERSION_NAME` in `gradle.properties` of the Android SDK from `2.17.1` to `2.17.2-SNAPSHOT`.
  - Increased the `MinimumOSVersion` in `AppFrameworkInfo.plist` of the Flutter example iOS app from `11.0` to `12.0`.
  - Modified the Xcode project file `project.pbxproj` in the Flutter example iOS app to include a new build phase for copying Pods resources.
  
- **Important code modifications**
  - Updated the Android SDK version in `gradle.properties`.
  - Changed the minimum iOS version in `AppFrameworkInfo.plist`.
  - Added a new build phase for copying Pods resources in the Xcode project file.
  - Updated the `LastUpgradeCheck` attribute in the Xcode project file.

- **New features or fixes**
  - Added a new build phase for copying Pods resources in the Xcode project file, which could be related to managing dependencies or resources more efficiently in the Flutter example iOS app.

- **Breaking changes or API updates**
  - No breaking changes or API updates mentioned in the provided diff.

## SDK

- **Key functional changes**
  - Updated the `github.com/livekit/protocol` dependency from version `1.39.0` to `1.39.2`.
  - Updated several dependencies related to WebRTC, RTP, SDP, and SRTP.

- **Important code modifications**
  - Updated versions of `github.com/pion/interceptor`, `github.com/pion/rtp`, `github.com/pion/sdp/v3`, and `github.com/pion/webrtc/v4`.
  - Updated versions of `github.com/pion/srtp/v3` and `github.com/pion/stun/v3`.

- **New features or fixes**
  - No specific new features or fixes mentioned in the provided diff.

- **Breaking changes or API updates**
  - No breaking changes or API updates mentioned in the provided diff.

## Agents

- **Key functional changes**
  - Addition of AssemblyAI plugin for speech recognition in LiveKit Agents.
  - Bugfix related to UUID generation in the `job_proc_lazy_main.ts` file.

- **Important code modifications**
  - In `job_proc_lazy_main.ts`, the `randomUUID` function call was corrected to `randomUUID()` to generate a unique request ID.
  - Addition of new files like `four-wasps-rule.md`, `README.md` for AssemblyAI plugin, and `api-extractor.json` for configuration.

- **New features or fixes**
  - Introduction of the AssemblyAI plugin for speech recognition within LiveKit Agents.
  - Bugfix related to UUID generation in the `job_proc_lazy_main.ts` file.

- **Breaking changes or API updates**
  - No explicit breaking changes or API updates mentioned in the provided diff.

## Embedded

- **Key functional changes**
  - Updated the README file to provide detailed information about the LiveKit demo, including structure, sandbox token server setup, build instructions, and device path determination.
- **Important code modifications**
  - Added detailed instructions and configurations in the README file for setting up and running the LiveKit demo on ESP32-series chips.
  - Modified the CMakeLists.txt file for the LiveKit component, potentially updating build configurations or dependencies.
- **New features or fixes**
  - Added instructions for setting Wi-Fi SSID and password, exporting Sandbox Token Server ID, setting the target, and building, flashing, and monitoring the demo.
  - Provided guidance on determining the device path for different operating systems.
- **Breaking changes or API updates**
  - Mentioned that the LiveKit API is in early development and may undergo breaking changes, indicating potential future modifications to the API.

## Examples

- **Key functional changes**
  - Added a new function `isLowPowerDevice` to the `client-utils` library.
  - Updated video capture and publishing defaults based on device power.
- **Important code modifications**
  - Added `isLowPowerDevice` function import in `PageClientImpl.tsx`.
  - Modified video capture and publishing defaults based on device power in `PageClientImpl.tsx`.
  - Updated CameraSettings component in `CameraSettings.tsx`.
- **New features or fixes**
  - Added `isLowPowerDevice` function to determine if the device is low power.
  - Adjusted video capture and publishing defaults dynamically based on device power.
- **Breaking changes or API updates**
  - No breaking changes or API updates mentioned in the provided diff.

## Other

- **Key functional changes**
  - Added support for Cartesia as a new STT provider in the Agents framework.
  - Enhanced user transcription events to include a `speaker_id` field if speaker diarization is supported.
  
- **Important code modifications**
  - Reordered imports in `full-llm.txt` to import `rtc` from `livekit` before importing `Agent` from `livekit.agents`.
  - Updated the `on_user_input_transcribed` function in `full-llm.txt` to include printing the `speaker_id` if available.
  - Added Cartesia and Sarvam as new STT providers in the list of supported providers in `full-llm.txt`.
  - Added a new section for Cartesia in the documentation with an overview.
  
- **New features or fixes**
  - Added Cartesia as a new STT provider with an overview in the documentation.
  - Enhanced user transcription events by adding a `speaker_id` field if speaker diarization is supported.
  
- **Breaking changes or API updates**
  - No breaking changes or API updates mentioned in the provided diff.
