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

struct RoomMetadata: Codable {
    let enableChat: Bool
    let creatorIdentity: String
    let allowParticipant: Bool

    private enum CodingKeys: String, CodingKey {
        case enableChat = "enable_chat",
             creatorIdentity = "creator_identity",
             allowParticipant = "allow_participant"
    }

    init(enableChat: Bool = false,
         creatorIdentity: String = "",
         allowParticipant: Bool = false)
    {
        self.enableChat = enableChat
        self.creatorIdentity = creatorIdentity
        self.allowParticipant = allowParticipant
    }
}
