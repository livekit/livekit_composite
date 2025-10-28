Pod::Spec.new do |s|
  s.name = 'SwiftCrypto'
  s.version = '3.15.1'
  s.license = { :type => 'Apache-2.0', :file => 'LICENSE.txt' }
  s.summary = 'Open-source implementation of a substantial portion of the API of Apple CryptoKit'
  s.description = <<-DESC
    SwiftCrypto is an open-source implementation of a substantial portion of the API of Apple CryptoKit. 
    This CocoaPods podspec provides the Swift interface for cryptographic operations including hashing, 
    symmetric encryption, digital signatures, key agreement, and more.
  DESC
  s.homepage = 'https://github.com/apple/swift-crypto'
  s.author = 'Apple Inc. and the SwiftCrypto project authors'
  s.source = { :git => 'https://github.com/apple/swift-crypto.git', :tag => s.version.to_s }
  s.documentation_url = 'https://github.com/apple/swift-crypto'
  s.module_name = 'Crypto'

  s.swift_version = '5.10'
  s.ios.deployment_target = '13.0'
  s.osx.deployment_target = '10.15'

  # Main Crypto module - simplified for CocoaPods
  s.source_files = 'Sources/Crypto/**/*.swift'
  
  s.exclude_files = [
    'Sources/Crypto/CMakeLists.txt',
    'Sources/Crypto/AEADs/Nonces.swift.gyb',
    'Sources/Crypto/Digests/Digests.swift.gyb',
    'Sources/Crypto/Key Agreement/ECDH.swift.gyb',
    'Sources/Crypto/Signatures/ECDSA.swift.gyb'
  ]
  
  s.resources = ['Sources/Crypto/PrivacyInfo.xcprivacy']

  s.pod_target_xcconfig = {
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '$(inherited) CRYPTO_IN_SWIFTPM'
  }

  # Note: This podspec provides only the Swift interface.
  # For full functionality including BoringSSL, use Swift Package Manager
  # or consider using a pre-built framework approach.
end
