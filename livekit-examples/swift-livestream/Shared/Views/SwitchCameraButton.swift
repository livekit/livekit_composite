/*
 * Copyright 2024 LiveKit
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import LiveKit
import SwiftUI

struct SwitchCameraButton: View {
    @EnvironmentObject var room: Room
    @EnvironmentObject var participant: Participant

    @State var canSwitchPosition = false

    var body: some View {
        Group {
            if participant is LocalParticipant, canSwitchPosition {
                StyledButton(style: .clear,
                             isFullWidth: false)
                {
                    Task {
                        if let track = participant.firstCameraVideoTrack as? LocalVideoTrack,
                           let cameraCapturer = track.capturer as? CameraCapturer
                        {
                            try await cameraCapturer.switchCameraPosition()
                        }
                    }
                } label: {
                    Image(systemName: "arrow.triangle.2.circlepath")
                }
                .cornerRadius(6)
            }
        }.onAppear(perform: {
            Task { @MainActor in
                canSwitchPosition = try await CameraCapturer.canSwitchPosition()
            }
        })
    }
}
