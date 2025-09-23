# CallKit + PushKit example

This example demonstrates how to use the LiveKit Swift SDK with CallKit and PushKit.

### Testing remote VoIP pushes

Use the [Push Notification Console](https://developer.apple.com/documentation/usernotifications/testing-notifications-using-the-push-notification-console) to send a `VoIP` push to your token.

You can obtain the push token by running the example app on a device.

### Key points when integrating LiveKit SDK with CallKit

CallKit on iOS sets AVAudioSession active automatically at specific timings.
By default, the LiveKit Swift SDK also configures the AVAudioSession automatically, which will interfere with CallKit.

We should ensure proper timing when configuring `AVAudioSession` and starting the SDK's internal `AVAudioEngine` between
[provider(_:didActivate:)](https://developer.apple.com/documentation/callkit/cxproviderdelegate/provider(_:didactivate:)) and [provider(_:didDeactivate:)](https://developer.apple.com/documentation/callkit/cxproviderdelegate/provider(_:diddeactivate:)).

Early in the process, we should disable automatic AVAudioSession configuration:
```swift
AudioManager.shared.audioSession.isAutomaticConfigurationEnabled = false
```

We should also ensure the SDK's internal `AVAudioEngine` will not start, even when subscribing to remote audio or publishing microphone:
```swift
try AudioManager.shared.setEngineAvailability(.none)
```

Now, in the `CXProviderDelegate`, we want to ensure `AVAudioSession.category` is set to `.playAndRecord` (if you will publish microphone).
We also want to allow the SDK's internal `AVAudioEngine` to start within the `didActivate` ~ `didDeactivate` window.
```swift
func provider(_: CXProvider, didActivate session: AVAudioSession) {
  do {
    try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.mixWithOthers])
    try AudioManager.shared.setEngineAvailability(.default)
  } catch {
    // Error
  }
}

func provider(_: CXProvider, didDeactivate _: AVAudioSession) {
  do {
    try AudioManager.shared.setEngineAvailability(.none)
  } catch {
    // Error
  }
}
```
> **NOTE:** We don't call `session.setActive(true)` since CallKit already activates it and Apple doesn't recommend calling it again.

With this setup, you can connect, publish, and subscribe to audio at timings convenient to your implementation and requirements. See the source code of this example for details.

### CallKit lock screen / background issues

These are issues I've encountered while implementing this example. Please let me know if there are better workarounds or if I'm incorrect.

1. [reportNewIncomingCall(with:update:completion:)](https://developer.apple.com/documentation/callkit/cxprovider/reportnewincomingcall(with:update:completion:)) must be invoked on the same thread as [pushRegistry(_:didReceiveIncomingPushWith:for:completion:)](https://developer.apple.com/documentation/pushkit/pkpushregistrydelegate/pushregistry(_:didreceiveincomingpushwith:for:completion:)), otherwise it will silently fail and not show the incoming call UI on the lock screen. Therefore, the async version may not work as intended.

2. You may need to set `AVAudioSession.category` to `.playAndRecord` before calling [reportNewIncomingCall(with:update:completion:)](https://developer.apple.com/documentation/callkit/cxprovider/reportnewincomingcall(with:update:completion:)) when your app is woken up in the background by [pushRegistry(_:didReceiveIncomingPushWith:for:completion:)](https://developer.apple.com/documentation/pushkit/pkpushregistrydelegate/pushregistry(_:didreceiveincomingpushwith:for:completion:)).

### References

[Responding to VoIP Notifications from PushKit](https://developer.apple.com/documentation/pushkit/responding-to-voip-notifications-from-pushkit)
[Developer Forums: CallKit does not activate audio session](https://developer.apple.com/forums/thread/783870)
