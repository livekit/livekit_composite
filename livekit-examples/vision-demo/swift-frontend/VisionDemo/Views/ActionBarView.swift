import LiveKit
import SwiftUI

struct ActionBarView: View {
    @EnvironmentObject var chatContext: ChatContext
    @EnvironmentObject var room: Room

    var body: some View {
        HStack(spacing: 20) {
            Button(action: {
                Task {
                    try await room.localParticipant.setMicrophone(enabled: !room.localParticipant.isMicrophoneEnabled())
                }
            }) {
                Label("Microphone", systemImage: "mic.fill")
            }
            .buttonStyle(.circleButton(isActive: room.localParticipant.isMicrophoneEnabled()))

            Button(action: {
                Task {
                    if room.localParticipant.isScreenShareEnabled() {
                        try await room.localParticipant.set(
                            source: .screenShareVideo,
                            enabled: false,
                            captureOptions: ScreenShareCaptureOptions(useBroadcastExtension: true)
                        )
                    }
                    try await chatContext.setCamera(enabled: !room.localParticipant.isCameraEnabled())
                }
            }) {
                Label("Camera", systemImage: "video.fill")
            }
            .buttonStyle(.circleButton(isActive: room.localParticipant.isCameraEnabled()))

            Button(action: {
                Task {
                    if room.localParticipant.isCameraEnabled() {
                        try await chatContext.setCamera(enabled: false)
                    }
                    try await room.localParticipant.set(
                        source: .screenShareVideo,
                        enabled: !room.localParticipant.isScreenShareEnabled(),
                        captureOptions: ScreenShareCaptureOptions(useBroadcastExtension: true)
                    )
                }
            }) {
                Label("Share Screen", systemImage: "rectangle.dashed.badge.record")
            }
            .buttonStyle(.circleButton(isActive: room.localParticipant.isScreenShareEnabled()))

            Button(action: {
                Task {
                    await chatContext.disconnect()
                }
            }) {
                Label("Stop", systemImage: "xmark").fontWeight(.semibold)
            }
            .buttonStyle(.circleButton(isActive: false))
        }
        .frame(maxWidth: .infinity)
        .padding()
    }
}
