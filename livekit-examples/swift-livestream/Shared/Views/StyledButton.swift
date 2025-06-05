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

struct BlueButtonStyle: ButtonStyle {
    let color: Color
    func makeBody(configuration: Self.Configuration) -> some View {
        configuration.label
            .foregroundColor(Color.white)
            .background(color)
            .contentShape(Rectangle())
            .cornerRadius(6.0)
            .opacity(configuration.isPressed ? 0.5 : 1)
    }
}

enum StyledButtonStyle {
    case normal
    case primary
    case secondary
    case destructive
    case clear
}

enum StyledButtonSize {
    case normal
    case small
}

struct StyledButton<Label>: View where Label: View {
    var style: StyledButtonStyle = .normal
    var size: StyledButtonSize = .normal
    var isFullWidth = true
    var isBusy = false
    var isEnabled = true

    let action: () -> Void
    let label: () -> Label

    var body: some View {
        Button {
            action()
        } label: {
            HStack(spacing: 10) {
                if isBusy {
                    ProgressView()
                        .controlSize(.small)
                }
                label()
                    .font(.system(size: size.toFontSize(), weight: .bold))
            }
            .padding(.horizontal, size.toHPadding())
            .padding(.vertical, size.toVPadding())
            .frame(maxWidth: isFullWidth ? .infinity : nil)
        }
        .buttonStyle(BlueButtonStyle(color: style.toColor()))
        .disabled(isBusy || !isEnabled)
        .opacity((isBusy || !isEnabled) ? 0.5 : 1)
        .cornerRadius(6)
    }
}

private extension StyledButtonStyle {
    func toColor() -> Color {
        switch self {
        case .normal: return Color.white.opacity(0.1)
        case .primary: return Color("Primary")
        case .secondary: return Color("Secondary")
        case .destructive: return Color("Destructive")
        case .clear: return Color.clear
        }
    }
}

private extension StyledButtonSize {
    func toFontSize() -> Double {
        switch self {
        case .normal: return 17
        case .small: return 12
        }
    }

    func toVPadding() -> Double {
        switch self {
        case .normal: return 13
        case .small: return 8
        }
    }

    func toHPadding() -> Double {
        switch self {
        case .normal: return 20
        case .small: return 10
        }
    }
}
