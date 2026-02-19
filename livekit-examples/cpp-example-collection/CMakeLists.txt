cmake_minimum_required(VERSION 3.20)
project(livekit_cpp_example_collection LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Make "include(LiveKitSDK)" search in ./cmake
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

set(LIVEKIT_SDK_VERSION "latest" CACHE STRING "LiveKit C++ SDK version (e.g. 0.2.0 or latest)")

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(LiveKitSDK)

livekit_sdk_setup(
  VERSION  "${LIVEKIT_SDK_VERSION}"
  SDK_DIR  "${CMAKE_BINARY_DIR}/_deps/livekit-sdk"
  GITHUB_TOKEN "$ENV{GITHUB_TOKEN}"
)

find_package(LiveKit CONFIG REQUIRED)
add_subdirectory(basic_room)
