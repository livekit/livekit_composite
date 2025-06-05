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
import SwiftUIBackports

struct MessageBarView: View {
    @EnvironmentObject var roomCtx: RoomContext
    @EnvironmentObject var room: Room

    @FocusState var focusFields: StreamView.TextFields?

    let moreAction: () -> Void

    var body: some View {
        HStack {
            TextField("", text: $roomCtx.message)
                .focused($focusFields, equals: .message)
                .lineLimit(5)
                .font(.system(size: 12))
                .padding(.vertical, 8)
                .padding(.horizontal, 10)
                .background(Color.white.opacity(0.2))
                .cornerRadius(6)
                .frame(maxWidth: .infinity)

            StyledButton(style: .secondary,
                         size: .small,
                         isFullWidth: false,
                         isEnabled: roomCtx.canSendMessage)
            {
                roomCtx.sendChat()
            } label: {
                Text("Send")
            }

            if !roomCtx.isStreamHost {
                let handRaised = room.localParticipant.typedMetadata.handRaised

                StyledButton(style: .clear,
                             size: .small,
                             isFullWidth: false)
                {
                    if handRaised {
                        roomCtx.leave()
                    } else {
                        roomCtx.raiseHand()
                    }
                } label: {
                    Image(systemName: handRaised ? "hand.wave.fill" : "hand.wave")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 12, height: 12)
                        .foregroundColor(handRaised ? Color("Primary") : Color.gray)
                }
            }

            StyledButton(style: .clear,
                         size: .small,
                         isFullWidth: false)
            {
                moreAction()
            } label: {
                Image(systemName: "ellipsis")
                    .resizable()
                    .scaledToFit()
                    .rotationEffect(.degrees(90))
                    .frame(width: 12, height: 12)
                    .foregroundColor(Color("Secondary"))
            }
        }
        .padding(.vertical, 15)
        .padding(.horizontal, 10)
    }
}
