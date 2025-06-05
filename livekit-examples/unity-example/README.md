# unity-example
Unity sample app

Notice. This is still an unstable version and is only used for early testing.

## Getting Started

### Prerequisites

- Unity 2022.3.20f1
- Visual Studio 2022 for Windows
- Xcode for macOS
- Enable Android support in Unity Hub

### Installation

1. Clone the repo to your local machine.

   ```sh
   git clone https://github.com/livekit-examples/unity-example.git
   ```

   Clone unity sdk (draft for android support) to the same directory

    ```sh
    git clone https://github.com/livekit/client-sdk-unity.git
    cd client-sdk-unity && python install.py
    ```

2. Open the project with Unity 2022.3.20f1 and add the livekit unity sdk package.

   Open Package Manager -> Add package from disk -> select the client-sdk-unity folder

3. Test the sample app.

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
