package io.livekit.flutter.fliters.example.livekit_filter_plugin_example

import com.cloudwebrtc.webrtc.video.LocalVideoTrack
import io.flutter.Log
import org.webrtc.VideoFrame

class VideoFilter : LocalVideoTrack.ExternalVideoFrameProcessing {
    private val TAG = "VideoFilter"
    override fun onFrame(frame: VideoFrame?): VideoFrame? {
        /// you can processing video frame here
        Log.i(TAG, "onFrame ...")
        return frame
    }
}