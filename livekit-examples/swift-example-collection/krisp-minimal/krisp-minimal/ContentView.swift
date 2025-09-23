/*
 * Copyright 2025 LiveKit
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
import LiveKitKrispNoiseFilter
import SwiftUI

// 1. Keep a global instance of the filter
let filter = LiveKitKrispNoiseFilter()

struct ContentView: View {
    @AppStorage("url") var url: String = ""
    @AppStorage("token") var token: String = ""

    @StateObject var room = Room()
    @State var isMicEnabled: Bool = false
    @State var isFilterEnabled: Bool = false
    @State var isAppleVoiceProcessingEnabled: Bool = true

    var buttonTitle: String {
        if room.connectionState == .connecting {
            return "Connecting..."
        } else if room.connectionState == .connected {
            return "Disconnect"
        }

        return "Connect"
    }

    var body: some View {
        VStack(spacing: 10) {
            Text("Krisp Noise Filter Example")
                .font(.title)

            Text("Connection state: \(String(describing: room.connectionState))")

            Form {
                Section("1. Connect to Room") {
                    TextField("URL", text: $url).disabled(room.connectionState != .disconnected)

                    TextField("Token", text: $token).disabled(room.connectionState != .disconnected)

                    Button(buttonTitle) {
                        Task {
                            if room.connectionState == .disconnected {
                                do {
                                    try await room.connect(url: url, token: token)
                                } catch {
                                    print("Connect room error: \(error.localizedDescription)")
                                }
                            } else if room.connectionState == .connected {
                                await room.disconnect()
                            }
                        }
                    }.disabled(room.connectionState == .connecting)
                }

                Section("2. Publish audio") {
                    Toggle("Mic enabled", isOn: $isMicEnabled)
                }.disabled(room.connectionState != .connected)

                Section("3. Toggle audio processing") {
                    Toggle("Krisp noise filter", isOn: $isFilterEnabled)
                    Toggle("Apple voice processing", isOn: $isAppleVoiceProcessingEnabled)
                }.disabled(room.connectionState != .connected)
            }
            .formStyle(.grouped)
        }
        .padding()
        .onAppear(perform: {
            Task {
                // 2. Attach filter to Room before connecting (Important)
                room.add(delegate: filter)
            }
        })
        .onDisappear(perform: {
            Task {
                await room.disconnect()
            }
        })
        .onChange(of: room.connectionState) { _, newValue in
            if newValue == .disconnected {
                // Reset state on disconnect
                isMicEnabled = false
            }
        }
        .onChange(of: isMicEnabled) { oldValue, newValue in
            if room.connectionState == .connected {
                Task {
                    do {
                        try await room.localParticipant.setMicrophone(enabled: newValue)
                    } catch {
                        print("Mic publish error: \(error.localizedDescription)")
                        // Revert to old value if failed
                        isMicEnabled = oldValue
                    }
                }
            }
        }
        .onChange(of: isFilterEnabled) { _, newValue in
            // 3. Attach filter to audio processing
            AudioManager.shared.capturePostProcessingDelegate = newValue ? filter : nil
        }
        .onChange(of: isAppleVoiceProcessingEnabled) { _, newValue in
            // Dynamically update apple vp
            AudioManager.shared.isVoiceProcessingBypassed = !newValue
        }
    }
}
