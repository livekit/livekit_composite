import SwiftUI

struct CircleButtonStyle: ButtonStyle {
    var isActive: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 24))
            .foregroundColor(isActive ? .contentActive : .contentPrimary)
            .frame(width: 64, height: 64)
            .background(
                Circle()
                    .fill(isActive ? Color.contentPrimary : Color.buttonBackground)
            )
            .opacity(configuration.isPressed ? 0.7 : 1.0)
            .animation(.easeInOut, value: isActive)
            .animation(.easeInOut, value: configuration.isPressed)
            .labelStyle(.iconOnly)
    }
}

extension ButtonStyle where Self == CircleButtonStyle {
    static func circleButton(isActive: Bool) -> CircleButtonStyle {
        CircleButtonStyle(isActive: isActive)
    }
}

#Preview {
    var isActive = false

    Button(action: {
        isActive.toggle()
    }) {
        Image(systemName: "video.fill")
    }
    .buttonStyle(.circleButton(isActive: isActive))
}
