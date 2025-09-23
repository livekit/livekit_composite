Pod::Spec.new do |spec|
  spec.name = 'LiveKitKrispNoiseFilter'
  spec.version = '0.0.8'
  spec.summary = 'swift krisp noise filter.'
  spec.description = <<-DESC
    krisp noise filter pre-compiled library for Darwin.
    DESC

  spec.homepage = 'https://github.com/livekit/swift-krisp-noise-filter'
  spec.license = { :type => 'Custom', :text => 'Please see https://livekit.io/legal/terms-of-service for the LiveKit Cloud Terms of Service.' }
  spec.author = 'livekit'
  spec.ios.deployment_target = '13.0'
  spec.osx.deployment_target = '10.15'

  spec.source = { :http => 'https://github.com/livekit/swift-krisp-noise-filter/releases/download/0.0.8/KrispNoiseFilter.xcframework.zip' }
  spec.vendored_frameworks = 'KrispNoiseFilter.xcframework'
end
