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

import SFSafeSymbols
import SwiftUI

struct TextLabel: View {
    enum Style {
        case normal
        case primary
    }

    let text: String
    var symbol: SFSymbol?
    var style: Style = .normal

    var body: some View {
        HStack(spacing: 5) {
            if let symbol {
                Image(systemSymbol: symbol)
            }
            Text(text)
        }
        .font(.system(size: 14, weight: .bold))
        .padding(.horizontal, 7)
        .padding(.vertical, 5)
        .background(style.toColor())
        .cornerRadius(6)
    }
}

extension TextLabel.Style {
    func toColor() -> Color {
        switch self {
        case .normal: return Color.black.opacity(0.6)
        case .primary: return Color("Primary").opacity(0.8)
        }
    }
}
