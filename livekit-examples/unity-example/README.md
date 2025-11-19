# unity-example
Unity sample app

Notice. This is still an unstable version and is only used for early testing.

## Getting Started

### Prerequisites

- Unity 2022.3.20f1
- Visual Studio 2022 for Windows
- Xcode for macOS
- Enable Android support in Unity Hub
- Git LFS : required for downloading Unity SDK plugin binaries

### Setup Instructions

1. Install Git LFS (Required)
    The LiveKit Unity SDK contains several large binary assets (e.g. Runtime/Plugins/Google.Protobuf.dll) that are stored using Git LFS.
    You must install Git LFS before cloning the SDK.

    Install Git LFS:
    ```sh
    brew install git-lfs         # macOS
    sudo apt-get install git-lfs # Ubuntu/Debian
    choco install git-lfs        # Windows (Chocolatey)
    ```
    Then initialize it:
    ```sh
    git lfs install
    ```

2. Clone the Repositories
   Clone the example project
   ```sh
   git clone https://github.com/livekit-examples/unity-example.git
   ```

   Clone the LiveKit Unity SDK
    ```sh
    git clone https://github.com/livekit/client-sdk-unity.git
    cd client-sdk-unity
    python install.py
    ```

    (Optional) Verify LFS assets were downloaded correctly
    
    If any plugin files appear as tiny text pointer files instead of real binaries:
    ```sh
    git lfs pull
    ```

3. Open the project in Unity

    Use Unity 2022.3.20f1.

    Then add the LiveKit Unity SDK as a package:

        1. Open Package Manager

        2. Select Add package from disk

        3. Choose the client-sdk-unity folder you cloned earlier

4. Test the sample app.

    Edit unity-example/LivekitUnitySampleApp/Assets/Scenes/LivekitSamples.cs

    ```csharp
        public class LivekitSamples : MonoBehaviour
        {
            public string url = "your url";
            public string token = "your token";
            .....
        }
    ```

    Run the app in Unity Editor or build it to your device.
