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

@main
struct ComponentsExampleApp: App {
    // Demo e2ee key
    let e2eeOptions = E2EEOptions(keyProvider: BaseKeyProvider(isSharedKey: true, sharedKey: "hello-livekit"))

    var body: some Scene {
        WindowGroup {
            // ComponentsScope(uiOptions: CustomUIExample()) {
            RoomScope(roomOptions: RoomOptions(e2eeOptions: e2eeOptions)) {
                VideoConferenceView()
            }
            // }
        }
    }
}
