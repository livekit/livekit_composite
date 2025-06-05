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

struct UserTileView: View {
    @EnvironmentObject var roomCtx: RoomContext
    @EnvironmentObject var room: Room
    @EnvironmentObject var participant: Participant

    var isMe: Bool {
        room.localParticipant.identity == participant.identity
    }

    var isCreator: Bool {
        room.typedMetadata.creatorIdentity == participant.identity?.stringValue
    }

    var isCoHost: Bool {
        !isCreator && participant.canPublish
    }

    var canInvite: Bool {
        roomCtx.isStreamOwner && !isCreator && !participant.canPublish && !participant.invited
    }

    var canReject: Bool {
        roomCtx.isStreamOwner && !isCreator && (participant.canPublish || participant.handRaised || participant.invited)
    }

    var canJoin: Bool {
        isMe && !participant.canPublish && participant.invited
    }

    var canCancel: Bool {
        !isCreator && isMe && (participant.canPublish || participant.handRaised || participant.invited)
    }

    var roleLabel: some View {
        Text(isCreator ? "Host" : "Co-Host")
            .textCase(.uppercase)
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(Color.gray)
    }

    func actionButton(title: String,
                      style: StyledButtonStyle,
                      isBusy: Bool = false,
                      action: @escaping () -> Void) -> some View
    {
        StyledButton(style: style,
                     size: .small,
                     isFullWidth: false,
                     isBusy: isBusy,
                     action: action,
                     label: {
                         Text(title)
                     })
    }

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            image(for: participant)
                .frame(width: 30, height: 30)

            Text(participant.identity?.stringValue ?? "?")
                .font(.system(size: 14, weight: .bold))

            if isCreator || isCoHost {
                roleLabel
            }

            Spacer()

            if canInvite {
                if let identity = participant.identity {
                    actionButton(title: participant.handRaised ? "Accept" : "Invite",
                                 style: .secondary,
                                 isBusy: roomCtx.inviteBusy.contains(identity))
                    {
                        roomCtx.inviteToStage(identity: identity)
                    }
                }
            }

            if canReject {
                actionButton(title: participant.invited ? "Cancel" : "Reject",
                             style: .destructive)
                {
                    if let identity = participant.identity {
                        roomCtx.removeFromStage(identity: identity)
                    }
                }
            }

            if canJoin {
                actionButton(title: "Join",
                             style: .secondary)
                {
                    roomCtx.raiseHand()
                }
            }

            if canCancel {
                actionButton(title: "Cancel",
                             style: .destructive)
                {
                    roomCtx.removeFromStage()
                }
            }
        }
    }
}
