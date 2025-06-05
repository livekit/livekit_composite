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

public struct ConnectView: View {
    @EnvironmentObject private var _room: Room
    @Environment(\.liveKitUIOptions) private var _ui: UIOptions

    @AppStorage("url") var url: String = ""
    @AppStorage("token") var token: String = ""

    @State private var isShowingErrorAlert = false

    public var body: some View {
        VStack(spacing: 15) {
            _ui.textFieldContainer {
                _ui.textField(for: $url, type: .url)
            } label: {
                Text("URL")
            }

            _ui.textFieldContainer {
                _ui.textField(for: $token, type: .token)
            } label: {
                Text("Token")
            }

            if case .connecting = _room.connectionState {
                ProgressView()
            } else {
                _ui.button {
                    Task {
                        try await _room.connect(url: url, token: token)
                    }
                } label: {
                    Text("Connect")
                }
                .disabled(_room.connectionState != .disconnected)
            }
        }
        .alert(isPresented: $isShowingErrorAlert, error: _room.disconnectError) {
            Button("OK") {
                //
            }
        }
        .onChange(of: _room.disconnectError) { error in
            if error != nil {
                isShowingErrorAlert = true
            }
        }
    }
}
