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

import AVFoundation
import LiveKit
import SwiftUI

struct ContentView: View {
    let frontTrack = LocalVideoTrack.createCameraTrack(options: CameraCaptureOptions(position: .front))
    let backTrack = LocalVideoTrack.createCameraTrack(options: CameraCaptureOptions(position: .back))

    var body: some View {
        VStack(spacing: 0) {
            SwiftUIVideoView(frontTrack).onTapGesture {
                Task {
                    do {
                        if frontTrack.trackState == .stopped {
                            try await frontTrack.start()
                        } else {
                            try await frontTrack.stop()
                        }
                    } catch {
                        print("Failed to toggle front track, error: \(error)")
                    }
                }
            }
            SwiftUIVideoView(backTrack, pinchToZoomOptions: [.zoomIn, .resetOnRelease]).onTapGesture {
                Task {
                    do {
                        if backTrack.trackState == .stopped {
                            try await backTrack.start()
                        } else {
                            try await backTrack.stop()
                        }
                    } catch {
                        print("Failed to toggle back track, error: \(error)")
                    }
                }
            }
        }
        .onAppear(perform: {
            Task {
                // The publishing order is important.
                // Publishing the back camera first may cause the SDK to prioritize the [Back Triple Camera] (if available),
                // and iOS will then block the front camera, as this combination is not supported in
                // `AVCaptureDevice.DiscoverySession.supportedMultiCamDeviceSets` due to resource constraints.
                // However, if you publish the front camera first, the SDK will prioritize a compatible device,
                // such as the [Back Dual Camera], which can be used simultaneously with the front camera.
                // You can also explicitly specify the device in CameraCaptureOptions.
                do {
                    try await frontTrack.start()
                    print("Started front track")
                } catch {
                    print("Failed to start front track, error: \(error)")
                }
                do {
                    try await backTrack.start()
                    print("Started back track")
                } catch {
                    print("Failed to start back track, error: \(error)")
                }
            }
        })
        .onDisappear(perform: {
            Task {
                do {
                    try await frontTrack.stop()
                    print("Stopped front track")
                } catch {
                    print("Failed to stop front track, error: \(error)")
                }
                do {
                    try await backTrack.stop()
                    print("Stopped back track")
                } catch {
                    print("Failed to stop back track, error: \(error)")
                }
            }
        })
    }
}
