package io.livekit.flutter.fliters.example.livekit_filter_plugin_example

import androidx.annotation.NonNull
import com.cloudwebrtc.webrtc.FlutterWebRTCPlugin
import com.cloudwebrtc.webrtc.LocalTrack
import com.cloudwebrtc.webrtc.audio.LocalAudioTrack
import com.cloudwebrtc.webrtc.video.LocalVideoTrack

import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result

/** LivekitFilterPluginExamplePlugin */
class LivekitFilterPluginExamplePlugin: FlutterPlugin, MethodCallHandler {
  private lateinit var channel : MethodChannel

  override fun onAttachedToEngine(flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
    channel = MethodChannel(flutterPluginBinding.binaryMessenger, "livekit_filter_plugin")
    channel.setMethodCallHandler(this)
  }

  private var audioFilter = AudioFilter()

  private var videoFilter = VideoFilter()

  override fun onMethodCall(call: MethodCall, result: Result) {
    if (call.method == "getPlatformVersion") {
      result.success("Android ${android.os.Build.VERSION.RELEASE}")
    } else if (call.method == "audio_filter_init" || call.method == "video_filter_init") {
      var flutterWebRTCPlugin = FlutterWebRTCPlugin.sharedSingleton;

      val trackId = call.argument<String>("trackId")
      if (trackId == null) {
        result.error("INVALID_ARGUMENT", "trackId is required", null)
        return
      }
      val track = flutterWebRTCPlugin.getLocalTrack(trackId)
      if(track != null) {
        if (track is LocalAudioTrack) {
          flutterWebRTCPlugin.audioProcessingController.capturePostProcessing.addProcessor(audioFilter)
        } else if(track is LocalVideoTrack) {
          var localVideoTrack = track as LocalVideoTrack
          localVideoTrack.addProcessor(videoFilter)
        }
      } else {
        result.error("trackNotFound", "Not found track for Id " + trackId, null)
        return
      }
      result.success(null)
    } else {
      result.notImplemented()
    }
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    channel.setMethodCallHandler(null)
  }
}
