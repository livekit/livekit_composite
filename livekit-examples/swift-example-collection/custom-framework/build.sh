# build for ios simulator
xcodebuild \
'BUILD_LIBRARY_FOR_DISTRIBUTION=YES' \
build \
-project "CustomFramework.xcodeproj" \
-scheme "CustomFramework" \
-destination 'generic/platform=iOS Simulator' \
-configuration Release \
-derivedDataPath build \

# build for ios device
# xcodebuild \
# 'BUILD_LIBRARY_FOR_DISTRIBUTION=YES' \
# build \
# -project "CustomFramework.xcodeproj" \
# -scheme "CustomFramework" \
# -destination 'generic/platform=iOS' \
# -configuration Release \
# -derivedDataPath build \
    
# build XCFramework
# xcodebuild \
# -create-xcframework \
# -framework "build/Build/Products/Release-iphoneos/CustomFramework.framework" \
# -framework "build/Build/Products/Release-iphonesimulator/CustomFramework.framework" \
# -output "./CustomFramework.xcframework"
