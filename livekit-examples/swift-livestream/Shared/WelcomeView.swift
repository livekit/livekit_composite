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

import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject var roomCtx: RoomContext

    var body: some View {
        VStack(alignment: .center, spacing: 12) {
            Spacer()

            Image("Logo")
                .resizable()
                .frame(width: 200, height: 200)
                .foregroundColor(.white)
                .padding()

            VStack(alignment: .center, spacing: 10) {
                Text("Welcome!")
                    .font(.system(size: 34, weight: .bold))

                Text("Welcome to the LiveKit live streaming demo app. You can join or start your own stream. Hosted on LiveKit Cloud.")
                    .multilineTextAlignment(.center)
                    .font(.system(size: 16))
                    .padding(.horizontal, 20)
            }

            Spacer()

            StyledButton(style: .primary) {
                Task {
                    await roomCtx.set(step: .streamerPrepare)
                }
            } label: {
                Text("Start a livestream")
            }

            StyledButton {
                Task {
                    await roomCtx.set(step: .viewerPrepare)
                }
            } label: {
                Text("Join a livestream")
            }
        }
        .padding()
    }
}
