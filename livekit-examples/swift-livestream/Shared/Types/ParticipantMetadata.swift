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

struct ParticipantMetadata: Codable {
    let handRaised: Bool
    let invitedToStage: Bool
    let avatarImage: String

    private enum CodingKeys: String, CodingKey {
        case handRaised = "hand_raised",
             invitedToStage = "invited_to_stage",
             avatarImage = "avatar_image"
    }

    init(hand_raised: Bool = false,
         invited_to_stage: Bool = false,
         avatar_image: String = "")
    {
        handRaised = hand_raised
        invitedToStage = invited_to_stage
        avatarImage = avatar_image
    }
}

extension ParticipantMetadata {
    var avatarURL: URL? {
        guard let url = URL(string: avatarImage) else {
            logger.warning("Failed to parse avatar url \(avatarImage)")
            return nil
        }

        return url
    }
}
