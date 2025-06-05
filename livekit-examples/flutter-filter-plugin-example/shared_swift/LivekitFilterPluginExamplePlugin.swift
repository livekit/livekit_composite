import WebRTC
import flutter_webrtc

#if os(macOS)
import Cocoa
import FlutterMacOS
#else
import Flutter
import UIKit
#endif

public class LivekitFilterPluginExamplePlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistrar) {
#if os(macOS)
    let messenger = registrar.messenger
#else
    let messenger = registrar.messenger()
 #endif
    let channel = FlutterMethodChannel(name: "livekit_filter_plugin", binaryMessenger: messenger)
    let instance = LivekitFilterPluginExamplePlugin()
    registrar.addMethodCallDelegate(instance, channel: channel)
  }
    
 private var videoFilter = LiveKitVideoFilter()
 private var audioFilter = LiveKitAudioFilter()

  public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "audio_filter_init":
        fallthrough
    case "video_filter_init":
        let args = call.arguments as! [String: Any]
        let trackId = args["trackId"] as? String
        let webrtc = FlutterWebRTCPlugin.sharedSingleton()
        if let unwrappedTrackId = trackId {
            let localTrack = webrtc?.localTracks![unwrappedTrackId]
            if let audioTrack = localTrack as? LocalAudioTrack {
                audioTrack.addProcessing(audioFilter)
            } else if let videoTrack = localTrack as? LocalVideoTrack {
                videoTrack.addProcessing(videoFilter)
            }
        }
        result(nil)
    default:
      result(nil)
    }
  }
}
