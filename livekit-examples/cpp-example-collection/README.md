# cpp-example-collection
This repository contains a collection of small, self-contained examples for the
[LiveKit C++ SDK](https://github.com/livekit/client-sdk-cpp).

The goal of these examples is to demonstrate common usage patterns of the
LiveKit C++ SDK (connecting to a room, publishing tracks, RPC, data streams,
etc.) without requiring users to build the SDK from source.


## How the SDK is provided

These examples **automatically download a prebuilt LiveKit C++ SDK release**
from GitHub at CMake configure time.

This is handled by the cmake helper: [LiveKitSDK.cmake ](https://github.com/livekit-examples/cpp-example-collection/cmake/LiveKitSDK.cmake)

## Selecting a LiveKit SDK version

By default, the examples download the **latest released** LiveKit C++ SDK.

You can pin a specific SDK version using the `LIVEKIT_SDK_VERSION` CMake option.

### Examples

Use the latest release:
```bash
cmake -S . -B build
# Or use a specific version (recommended for reproducibility):
cmake -S . -B build -DLIVEKIT_SDK_VERSION=0.2.0
```

Reconfigure to change versions:
```bash
rm -rf build
cmake -S . -B build -DLIVEKIT_SDK_VERSION=0.3.1
```


### Building the examples
#### macOS / Linux
```bash
cmake -S . -B build # add -DLIVEKIT_SDK_VERSION=0.2.0 if using a specific version
cmake --build build
```

#### Windows (Visual Studio generator)
```powershell
cmake -S . -B build # add -DLIVEKIT_SDK_VERSION=0.2.0 if using a specific version
cmake --build build --config Release
```

The Livekit Release SDK is downloaded into **build/_deps/livekit-sdk/**

### Running the examples

After building, example binaries are located under:
```bash
build/<example-name>/
```

For example:
```bash
./build/basic_room/basic_room --url <ws-url> --token <token>
```

### Supported platforms

Prebuilt SDKs are downloaded automatically for:
* Windows: x64
* macOS: x64, arm64 (Apple Silicon)
* Linux: x64

If no matching SDK is available for your platform, CMake configuration will fail with a clear error.