import LiveKit
import LiveKitComponents
import SwiftUI

struct CameraView: View {
    @EnvironmentObject var room: Room
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if let videoTrack = room.localParticipant.firstCameraVideoTrack {
                SwiftUIVideoView(videoTrack,
                                 renderMode: .sampleBuffer)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            } else {
                RoundedRectangle(cornerRadius: 16)
                    .background(Color.contentPrimary)
            }

            Button(action: {
                Task {
                    try? await (
                        (room.localParticipant.firstCameraVideoTrack as? LocalVideoTrack)?
                            .capturer as? CameraCapturer
                    )?.switchCameraPosition()
                }
            }) {
                Image(systemName: "camera.rotate")
                    .font(.system(size: 20))
                    .padding(12)
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 0)
            }
            .padding(16)
        }
    }
}
