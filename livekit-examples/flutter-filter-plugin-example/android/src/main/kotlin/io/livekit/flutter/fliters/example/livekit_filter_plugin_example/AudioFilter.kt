package io.livekit.flutter.fliters.example.livekit_filter_plugin_example

import android.util.Log
import com.cloudwebrtc.webrtc.audio.AudioProcessingAdapter
import java.nio.ByteBuffer

class AudioFilter : AudioProcessingAdapter.ExternalAudioFrameProcessing {
    private val TAG = "AudioFilter"
    override fun initialize(sampleRateHz: Int, numChannels: Int) {
        Log.i(TAG, "initialize( sampleRateHz $sampleRateHz, numChannels $numChannels )")
    }

    override fun reset(newRate: Int) {
        Log.i(TAG, "reset( newRate $newRate )")
    }

    override fun process(numBands: Int, numFrames: Int, buffer: ByteBuffer?) {
        if(buffer == null) {
            return
        }
        /// you can processing audio frame here
        Log.i(TAG, "process( numBands $numBands, numFrames $numFrames )")
    }
}