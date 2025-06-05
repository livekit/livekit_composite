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
import NukeUI
import SwiftUI

@MainActor
func image(for participant: Participant?) -> some View {
    Group {
        if let participant {
            LazyImage(url: URL(string: "https://api.multiavatar.com/\(String(describing: participant.identity?.stringValue)).png")) { state in
                if let image = state.image {
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Rectangle()
                        .foregroundColor(Color.white.opacity(0.1))
                }
            }
        } else {
            Rectangle()
                .foregroundColor(Color.white.opacity(0.1))
        }
    }
    .background(Color.clear)
    .clipShape(Circle())
}

struct StreamEventTileView: View {
    @EnvironmentObject var room: Room

    let entry: ChatMessage

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            image(for: entry.participant)
                .frame(width: 30, height: 30)

            VStack(alignment: .leading, spacing: 5) {
                if let participant = entry.participant {
                    Text(participant.identity?.stringValue ?? "?")
                        .font(.system(size: 14))
                        .fontWeight(.bold)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Text(entry.message)
                    .font(.system(size: 14))
                    .multilineTextAlignment(.leading)
                    .lineLimit(nil)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}
