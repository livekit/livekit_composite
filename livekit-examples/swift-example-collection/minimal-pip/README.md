# Minimal Picture-in-Picture example

### What this example demonstrates:
* iOS Picture-in-picture (PIP)
* Custom rendering with VideoRenderer protocol

### Steps to build
1. Change code signing settings to your own.
2. Set the url and token to the `.connect(url:token:)` call.
3. Run on iOS device.
4. Connect & publish video from another device.
5. Swipe up on iOS device to see video transition to PIP.

### Requirements for PIP to work
* AVAudioSession must be switched
* PIP must be enabled in Background modes
