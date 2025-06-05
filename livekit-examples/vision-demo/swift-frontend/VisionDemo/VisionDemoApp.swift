import SwiftUI

@main
struct VisionDemoApp: App {
    var body: some Scene {
        WindowGroup {
            ChatContextProvider {
                ConnectionView()
            }
        }
    }
}
