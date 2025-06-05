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

extension Image {
    func centerCropped() -> some View {
        GeometryReader { geo in
            self
                .resizable()
                .scaledToFill()
                .frame(width: geo.size.width, height: geo.size.height)
                .clipped()
        }
    }
}

struct PublisherVideoPreview: View {
    @EnvironmentObject var roomCtx: RoomContext
    @Environment(\.liveKitUIOptions) var ui: UIOptions

    var body: some View {
        ZStack(alignment: .topLeading) {
            GeometryReader { geometry in
                ZStack {
                    ui.videoDisabledView(geometry: geometry)
                    SwiftUIVideoView(roomCtx.localCameraTrack, mirrorMode: .mirror)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .cornerRadius(6)
        }
    }
}

struct SubscriberVideoView: View {
    @EnvironmentObject var room: Room
    @EnvironmentObject var ui: UIOptions

    var body: some View {
        ZStack(alignment: .topLeading) {
            GeometryReader { geometry in

                ZStack {
                    ui.videoDisabledView(geometry: geometry)

                    if let firstRemoteVideoTrack = room.remoteParticipants.values.map(\.firstCameraVideoTrack)
                        .compactMap({ $0 }).first
                    {
                        SwiftUIVideoView(firstRemoteVideoTrack)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .cornerRadius(6)
        }
    }
}
