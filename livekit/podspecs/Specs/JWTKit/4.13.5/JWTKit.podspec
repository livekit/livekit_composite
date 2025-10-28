Pod::Spec.new do |s|
  s.name = 'JWTKit'
  s.version = '4.13.5'
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.summary = 'JSON Web Token (JWT) signing and verification library for Swift.'
  s.description = <<-DESC
    JWTKit is a Swift library for JWT signing and verification, supporting various algorithms including HMAC, ECDSA, EdDSA, RSA, and PSS. It supports JWS and JWK standards.
  DESC
  s.homepage = 'https://github.com/vapor/jwt-kit'
  s.author = 'Vapor Core Team'
  s.source = { :git => 'https://github.com/vapor/jwt-kit.git', :tag => s.version.to_s }
  s.documentation_url = 'https://github.com/vapor/jwt-kit'
  s.module_name = 'JWTKit'

  s.swift_version = '5.9'
  s.ios.deployment_target = '13.0'
  s.osx.deployment_target = '10.15'

  s.default_subspec = 'Core'

  s.subspec 'Core' do |ss|
    ss.source_files = 'Sources/JWTKit/**/*.swift'
    ss.dependency 'SwiftCrypto', '~> 3.15.1'
    ss.dependency 'JWTKit/CJWTKitBoringSSL'
  end

  s.subspec 'CJWTKitBoringSSL' do |ss|
    ss.source_files = ['Sources/CJWTKitBoringSSL/**/*.c', 'Sources/CJWTKitBoringSSL/**/*.cc', 'Sources/CJWTKitBoringSSL/**/*.h']
    ss.public_header_files = 'Sources/CJWTKitBoringSSL/include/**/*.h'
    ss.header_dir = 'CJWTKitBoringSSL'
    ss.preserve_paths = 'Sources/CJWTKitBoringSSL/include/module.modulemap'
    ss.exclude_files = [
      'Sources/CJWTKitBoringSSL/hash.txt',
      'Sources/CJWTKitBoringSSL/**/*.S'
    ]
    ss.pod_target_xcconfig = {
      'HEADER_SEARCH_PATHS' => '$(inherited) $(PODS_TARGET_SRCROOT)/Sources/CJWTKitBoringSSL/include',
      'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) OPENSSL_NO_ASM=1',
      'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
      'MODULEMAP_FILE' => '$(PODS_TARGET_SRCROOT)/Sources/CJWTKitBoringSSL/include/module.modulemap'
    }
  end
end
