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

struct StyledTextField: View {
    enum Style {
        case normal
        case primary
        case secondary
        case destructive
    }

    let title: any StringProtocol
    let placeholder: any StringProtocol

    @Binding var text: String
    var style: Style = .normal

    var body: some View {
        VStack(alignment: .leading, spacing: 10.0) {
            Text(title)
                .fontWeight(.bold)

            TextField(placeholder, text: $text, onCommit: {
                //
            })
            .submitLabel(.done)
            .textFieldStyle(PlainTextFieldStyle())
            .disableAutocorrection(true)
            #if os(iOS)
                .textInputAutocapitalization(.never)
            #endif
                // TODO: add iOS unique view modifiers
                // #if os(iOS)
                // .autocapitalization(.none)
                // .keyboardType(type.toiOSType())
                // #endif
                .padding()
                .overlay(RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(Color.white.opacity(0.3),
                                  style: StrokeStyle(lineWidth: 1.0)))
        }.frame(maxWidth: .infinity)
    }
}

// private extension StyledButton.Style {
//
//    func toColor() -> Color {
//        switch self {
//        case .normal: return Color.white.opacity(0.1)
//        case .primary: return Color("Primary")
//        case .secondary: return Color("Secondary")
//        case .destructive: return Color("Destructive")
//        }
//    }
// }
