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
import SwiftUIBackports

extension Comparable {
    func clamp(minValue: Self, maxValue: Self) -> Self {
        min(max(minValue, self), maxValue)
    }

    func clamp(to range: ClosedRange<Self>) -> Self {
        clamp(minValue: range.lowerBound, maxValue: range.upperBound)
    }
}

struct StreamView: View {
    enum TextFields: Hashable {
        case message
    }

    @EnvironmentObject var roomCtx: RoomContext
    @EnvironmentObject var room: Room

    @State private var showingUsersSheet = false
    @State private var showingOptionsSheet = false
    @State private var showingEventsView = true

    @FocusState private var focusedFields: TextFields?

    var hasNotification: Bool {
        if roomCtx.isStreamOwner {
            return room.remoteParticipants.values.filter { $0.handRaised && !$0.canPublish }.count > 0
        } else {
            return room.localParticipant.invited && !room.localParticipant.canPublish
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { proxy in

                ZStack {
                    // Participants layer
                    VStack {
                        ForEachParticipant(filter: .canPublishVideoOrAudio) { _ in

                            ZStack(alignment: .topLeading) {
                                ParticipantView(showInformation: false)
                                    .background(Color(.darkGray))
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                                    .cornerRadius(6)

                                SwitchCameraButton()
                                    .padding()
                            }
                        }
                    }

                    // Overlay
                    VStack(alignment: .trailing) {
                        HStack(alignment: .bottom, spacing: 8) {
                            Spacer()

                            TextLabel(text: "LIVE", style: .primary)

                            ZStack(alignment: .topLeading) {
                                TextLabel(text: "\(room.participantCount)", symbol: .eye).onTapGesture {
                                    showingUsersSheet = true
                                }

                                if hasNotification {
                                    Circle()
                                        .foregroundColor(.red)
                                        .frame(width: 10, height: 10)
                                        .offset(x: -3, y: -3)
                                }
                            }
                        }
                        .padding()

                        Spacer()

                        if showingEventsView {
                            ZStack {
                                LinearGradient(gradient: Gradient(colors: [.clear, .black.opacity(0.8)]),
                                               startPoint: .top,
                                               endPoint: .bottom)

                                StreamEventsListView()
                                    .mask(LinearGradient(gradient: Gradient(colors: [.black, .black, .black, .clear]),
                                                         startPoint: .bottom,
                                                         endPoint: .top))
                            }
                            .frame(height: proxy.size.height * 0.4)
                            .transition(.opacity)
                        }
                    }
                }
                .onTapGesture {
                    if focusedFields == .message {
                        hideKeyboard()
                    } else {
                        withAnimation {
                            showingEventsView.toggle()
                        }
                    }
                }
            }

            ReactionsBarView()

            MessageBarView(focusFields: _focusedFields,
                           moreAction: {
                               showingOptionsSheet.toggle()
                           })
                           .sheet(isPresented: $showingOptionsSheet) {
                               OptionsSheet()
                           }
                           .sheet(isPresented: $showingUsersSheet) {
                               UsersSheet()
                           }
        }
        .onChange(of: focusedFields == .message, perform: { _ in
            withAnimation {
                showingEventsView = true
            }
        })
        .onChange(of: hasNotification, perform: { newValue in
            if newValue {
                showingUsersSheet = true
            }
        })
    }
}
