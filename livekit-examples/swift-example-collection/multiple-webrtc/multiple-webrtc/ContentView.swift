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

import SwiftUI

import LiveKit
import LiveKitWebRTC
import WebRTC

// Example of importing both LiveKit(LiveKitWebRTC) and normal WebRTC

struct ContentView: View {
    var body: some View {
        VStack {
            Button(action: {
                print("LiveKitSDK.version: \(LiveKitSDK.version)")

                // Example reading symbol from LiveKitWebRTC
                print("kRTCVp9CodecName (LiveKitWebRTC): \(LiveKitWebRTC.kLKRTCVp9CodecName)")
                // Example reading symbol from WebRTC
                print("kRTCVp9CodecName (WebRTC): \(WebRTC.kRTCVp9CodecName)")

                let instance1 = LiveKitWebRTC.LKRTCDefaultVideoEncoderFactory()
                print("DefaultVideoEncoderFactory (LiveKitWebRTC): \(String(describing: instance1))")

                let instance2 = WebRTC.RTCDefaultVideoEncoderFactory()
                print("DefaultVideoEncoderFactory (WebRTC): \(String(describing: instance2))")

            }, label: {
                Image(systemName: "globe")
                    .imageScale(.large)
                    .foregroundStyle(.tint)
                Text("Hello, world!")
            })
        }
        .padding()
    }
}
