Pod::Spec.new do |spec|

    spec.name         = "LiveKitKrispNoiseFilter"
    spec.version      = "0.0.7"
    spec.summary      = "swift krisp noise filter."
    spec.description  = <<-DESC
    krisp noise filter pre-compiled library for Darwin.
    DESC
  
    spec.homepage     = "https://github.com/livekit/swift-krisp-noise-filter"
    #spec.license      = { :type => 'Apache', :file => 'KrispNoiseFilter.xcframework/LICENSE' }
    spec.author       = "livekit"
    spec.ios.deployment_target = '13.0'
    spec.osx.deployment_target = '10.15'
  
    spec.source       = { :http => "https://github.com/livekit/swift-krisp-noise-filter/releases/download/0.0.7/KrispNoiseFilter.xcframework.zip" }
    spec.vendored_frameworks = "KrispNoiseFilter.xcframework"
    
  end