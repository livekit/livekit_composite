// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "LiveKitUniFFI",
    platforms: [
        .iOS(.v13),
        .macOS(.v10_15),
        .macCatalyst(.v14),
        .visionOS(.v2),
        .tvOS(.v17),
    ],
    products: [
        .library(
            name: "LiveKitUniFFI",
            targets: ["LiveKitUniFFI"]
        )
    ],
    targets: [
        .target(
            name: "LiveKitUniFFI",
            dependencies: ["RustLiveKitUniFFI"]
        ),
        .binaryTarget(
            name: "RustLiveKitUniFFI",
            url: "https://github.com/livekit/livekit-uniffi-xcframework/releases/download/0.0.2/RustLiveKitUniFFI.xcframework.zip",
            checksum: "ee5aa5feb3c94d39e87860807622dad65a5e8d4a1b6a4efe6d8bf7180ddd8756"
        )
    ]
)
