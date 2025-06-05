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

extension Room {
    var typedMetadata: RoomMetadata {
        guard let string = metadata,
              let data = string.data(using: .utf8),
              let obj = try? decoder.decode(RoomMetadata.self, from: data)
        else {
            return RoomMetadata()
        }

        return obj
    }
}

extension Participant {
    var typedMetadata: ParticipantMetadata {
        guard let string = metadata,
              let data = string.data(using: .utf8),
              let obj = try? decoder.decode(ParticipantMetadata.self, from: data)
        else {
            return ParticipantMetadata()
        }

        return obj
    }

    var invited: Bool {
        typedMetadata.invitedToStage
    }

    var handRaised: Bool {
        typedMetadata.handRaised
    }

    var canPublish: Bool {
        // Considered a host if has publish perms
        permissions.canPublish
    }
}

extension Collection<Participant> {
    var sortedByJoinedDate: [Participant] {
        sorted { p1, p2 in
            if p1 is LocalParticipant { return true }
            if p2 is LocalParticipant { return false }
            return (p1.joinedAt ?? Date()) < (p2.joinedAt ?? Date())
        }
    }
}

struct UsersSheet: View {
    @EnvironmentObject var roomCtx: RoomContext
    @EnvironmentObject var room: Room

    private func filteredByInvited() -> [Participant] {
        room.allParticipants.values.filter { !$0.canPublish && $0.invited }
    }

    private func filteredByJoinRequests() -> [Participant] {
        room.allParticipants.values.filter { !$0.canPublish && $0.handRaised }
    }

    private func filteredByHosts() -> [Participant] {
        room.allParticipants.values.filter(\.canPublish)
    }

    private func filteredByViewers() -> [Participant] {
        room.allParticipants.values.filter { !$0.canPublish && !$0.handRaised && !$0.invited }
    }

    var body: some View {
        let invited = filteredByInvited().sortedByJoinedDate
        let joinRequests = filteredByJoinRequests().sortedByJoinedDate
        let hosts = filteredByHosts().sortedByJoinedDate
        let viewers = filteredByViewers().sortedByJoinedDate

        ScrollView {
            LazyVStack(spacing: 20) {
                Text("Users")
                    .font(.system(size: 25, weight: .bold))
                    .padding()

                /* Invited users */

                if invited.count > 0 {
                    Text("Invited to be a co-host")
                        .textCase(.uppercase)
                        .foregroundColor(Color.gray)
                        .font(.system(size: 14, weight: .bold))

                    ForEach(invited) { participant in
                        UserTileView()
                            .environmentObject(participant)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 10)
                    }
                }

                /* Join request users */

                if joinRequests.count > 0 {
                    Text("Requests to join")
                        .textCase(.uppercase)
                        .foregroundColor(Color.gray)
                        .font(.system(size: 14, weight: .bold))

                    ForEach(joinRequests) { participant in
                        UserTileView()
                            .environmentObject(participant)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 10)
                    }
                }

                if hosts.count > 0 {
                    Text("Hosts")
                        .textCase(.uppercase)
                        .foregroundColor(Color.gray)
                        .font(.system(size: 14, weight: .bold))

                    ForEach(hosts) { participant in
                        UserTileView()
                            .environmentObject(participant)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 10)
                    }
                }

                if viewers.count > 0 {
                    Text("Viewers")
                        .textCase(.uppercase)
                        .foregroundColor(Color.gray)
                        .font(.system(size: 14, weight: .bold))

                    ForEach(viewers) { participant in
                        UserTileView()
                            .environmentObject(participant)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 10)
                    }
                }

                if !room.localParticipant.canPublish, !room.localParticipant.handRaised, !room.localParticipant.invited {
                    Button {
                        roomCtx.raiseHand()
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemSymbol: .personBadgePlus)
                            Text("Request to join")
                        }
                        .font(.system(size: 14, weight: .bold))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 5)
                        .foregroundColor(Color("Secondary"))
                    }
                }
            }
        }
        .backport.presentationDetents([.medium, .large])
        .backport.presentationDragIndicator(.visible)
        // .presentationBackground(.black)
        .padding()
        .frame(minWidth: 370)
    }
}
