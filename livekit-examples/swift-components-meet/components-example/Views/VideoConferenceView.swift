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
import LiveKitComponents
import SwiftUI

public struct VideoConferenceView: View {
    @EnvironmentObject private var _room: Room
    @Environment(\.liveKitUIOptions) private var _ui: UIOptions

    public init() {}

    func buildNotConnectedView() -> some View {
        ConnectView()
            .frame(maxWidth: 300)
    }

    func buildConnectedView() -> some View {
        HStack(spacing: _ui.participantViewSpacing) {
            ForEachParticipant { _ in
                ParticipantView()
                    .background(Color(.darkGray))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .cornerRadius(5)
            }
        }
        .padding(_ui.participantViewSpacing)
        .toolbar {
            ToolbarItemGroup(placement: .automatic) {
                if let name = _room.name {
                    Text(name)
                }

                Text(String(_room.remoteParticipants.count + 1))

                ControlsView()
            }
        }
    }

    public var body: some View {
        if [.reconnecting, .connected].contains(_room.connectionState) {
            buildConnectedView()
        } else {
            buildNotConnectedView()
        }
    }
}
