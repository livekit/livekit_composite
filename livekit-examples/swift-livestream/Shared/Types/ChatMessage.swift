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
import SwiftUI

struct ChatMessage: Codable, Identifiable {
    let id: String
    var participant: Participant?

    // Codable
    let timestamp: Int
    let message: String

    private enum CodingKeys: String, CodingKey {
        case timestamp,
             message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = UUID().uuidString
        timestamp = try container.decode(Int.self, forKey: .timestamp)
        message = try container.decode(String.self, forKey: .message)
    }

    init(timestamp: Int = 0,
         message: String = "",
         participant: Participant? = nil)
    {
        id = UUID().uuidString
        self.timestamp = timestamp
        self.message = message
        self.participant = participant
    }
}
