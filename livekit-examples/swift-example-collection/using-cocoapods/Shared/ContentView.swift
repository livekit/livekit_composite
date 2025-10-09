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

import LiveKitClient
import SwiftUI

class Controller: ObservableObject {
    let room: Room

    init() {
        print("init")
        room = Room()
        room.add(delegate: self)

        Task {
            try await room.connect(url: "wss://_____.livekit.cloud",
                                   token: "")
        }
    }

    deinit {
        print("deinit")
    }
}

extension Controller: RoomDelegate {
    func room(_: Room, didUpdateConnectionState connectionState: ConnectionState, from _: ConnectionState) {
        print("connectionState -> \(connectionState)")
    }
}

struct ContentView: View {
    @ObservedObject var ctrl = Controller()

    var body: some View {
        Text("LiveKit Client SDK Ver. \(LiveKitSDK.version)")
            .padding()
    }
}
