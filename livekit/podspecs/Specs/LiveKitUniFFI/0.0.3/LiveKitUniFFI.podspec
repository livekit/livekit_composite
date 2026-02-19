Pod::Spec.new do |spec|
  spec.name = "LiveKitUniFFI"
  spec.version = "0.0.3"
  spec.summary = "LiveKit UniFFI bindings"
  spec.description = <<-DESC
    LiveKit UniFFI XCFramework with Swift bindings
  DESC

  spec.homepage = "https://github.com/livekit/livekit-uniffi-xcframework"
  spec.author = "LiveKit"

  spec.ios.deployment_target = "13.0"
  spec.osx.deployment_target = "10.15"

  spec.source = {
    :git => "https://github.com/livekit/livekit-uniffi-xcframework.git",
    :tag => spec.version.to_s
  }

  spec.prepare_command = <<-CMD
    FRAMEWORK_URL="https://github.com/livekit/livekit-uniffi-xcframework/releases/download/#{spec.version}/RustLiveKitUniFFI.xcframework.zip"
    curl -L -o RustLiveKitUniFFI.xcframework.zip "$FRAMEWORK_URL"
    unzip -q RustLiveKitUniFFI.xcframework.zip
    rm RustLiveKitUniFFI.xcframework.zip
  CMD

  spec.module_name = "LiveKitUniFFI"
  spec.source_files = "Sources/LiveKitUniFFI/**/*.swift"
  spec.vendored_frameworks = "RustLiveKitUniFFI.xcframework"
end
