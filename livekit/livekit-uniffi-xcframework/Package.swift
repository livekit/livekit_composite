// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "LiveKitUniFFI",
    platforms: [
        .iOS(.v13),
        .macOS(.v10_15),
        .macCatalyst(.v14),
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
            url: "https://github.com/livekit/livekit-uniffi-xcframework/releases/download/0.0.5/RustLiveKitUniFFI.xcframework.zip",
            checksum: "9a21e046273f8804474eaf2532d67dc3a7d811b233d73e0115992bffd1942600"
        )
    ]
)
