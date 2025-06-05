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

import AlertToast
import LiveKit
import LiveKitComponents
import SwiftUI

struct OptionsSheet: View {
    @EnvironmentObject var roomCtx: RoomContext
    @EnvironmentObject var room: Room

    @State var showCopiedToast: Bool = false

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                Text("Options")
                    .font(.system(size: 25, weight: .bold))
                    .padding()

                HStack {
                    Text("Livestream code:")
                    Spacer()
                    if let roomName = room.name {
                        StyledButton(style: .secondary,
                                     size: .small,
                                     isFullWidth: false)
                        {
                            #if os(iOS)
                                UIPasteboard.general.string = roomName
                            #elseif os(macOS)
                                let pasteboard = NSPasteboard.general
                                pasteboard.declareTypes([.string], owner: nil)
                                pasteboard.setString(roomName, forType: .string)
                            #endif
                            showCopiedToast = true
                        } label: {
                            Text(roomName)
                        }
                    }
                }

                Spacer()

                StyledButton(style: .destructive,
                             isBusy: roomCtx.endStreamBusy)
                {
                    roomCtx.leave()
                } label: {
                    Text(roomCtx.isStreamOwner ? "End stream" : "Leave stream")
                }
            }
        }
        .backport.presentationDetents([.medium])
        .backport.presentationDragIndicator(.visible)
        // .presentationBackground(.black)
        .padding()
        .frame(minWidth: 300)
        .toast(isPresenting: $showCopiedToast) {
            AlertToast(type: .regular, title: "Copied!")
        }
    }
}
