import Foundation
import flutter_webrtc

class LiveKitVideoFilter: ExternalVideoProcessingDelegate {
    func onFrame(_ frame: RTCVideoFrame) -> RTCVideoFrame {
        /// you can processing video frame here
        print("LiveKitVideoFilter onFrame")
        return frame
    }
}
