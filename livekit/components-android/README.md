<!--BEGIN_BANNER_IMAGE-->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/.github/banner_dark.png">
  <source media="(prefers-color-scheme: light)" srcset="/.github/banner_light.png">
  <img style="width:100%;" alt="The LiveKit icon, the name of the repository and some sample code in the background." src="https://raw.githubusercontent.com/livekit/components-android/main/.github/banner_light.png">
</picture>

<!--END_BANNER_IMAGE-->

# LiveKit Components for Android

<!--BEGIN_DESCRIPTION-->
Use this SDK to add realtime video, audio and data features to your Android app. By connecting to <a href="https://livekit.io/">LiveKit</a> Cloud or a self-hosted server, you can quickly build applications such as multi-modal AI, live streaming, or video calls with just a few lines of code.
<!--END_DESCRIPTION-->

# Table of Contents

- [Docs](#docs)
- [Installation](#installation)
- [Usage](#basic-usage)

## Docs

Docs and guides at [https://docs.livekit.io](https://docs.livekit.io)

## Installation

LiveKit Components for Android is available as a Maven package.

```groovy title="build.gradle"
...
dependencies {
    // The components package has a different versioning than the main LiveKit SDK.
    implementation "io.livekit:livekit-android-compose-components:1.4.0"

    // Snapshots of the latest development version are available at:
    // implementation "io.livekit:livekit-android-compose-components:1.4.1-SNAPSHOT"

    // Depend on LiveKit SDK separately to keep up to date.
    implementation "io.livekit:livekit-android:$livekit_version"
}
```

You'll also need jitpack as one of your repositories.

```groovy
subprojects {
    repositories {
        google()
        mavenCentral()
        // ...
        maven { url 'https://jitpack.io' }

        // For SNAPSHOT access
        // maven { url 'https://central.sonatype.com/repository/maven-snapshots/' }
    }
}
```

## Basic Usage

```kotlin
@Composable
fun exampleComposable() {
    // Create and connect to a room.
    RoomScope(
        url = wsURL,
        token = token,
        audio = true,
        video = true,
        connect = true,
    ) {
        // Get all the tracks in the room
        val trackRefs = rememberTracks()

        // Display the video tracks
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            items(trackRefs.size) { index ->
                VideoTrackView(
                    trackReference = trackRefs[index],
                    modifier = Modifier.fillParentMaxHeight(0.5f)
                )
            }
        }
    }
}
```

## Example App

See our [Meet Example app](https://github.com/livekit-examples/android-components-meet) for a simple teleconferencing app, and [Livestream Example app](https://github.com/livekit-examples/android-livestream) for a 
fully-functional livestreaming app, with more fleshed out usage of the Components SDK.

<!--BEGIN_REPO_NAV-->
<br/><table>
<thead><tr><th colspan="2">LiveKit Ecosystem</th></tr></thead>
<tbody>
<tr><td>LiveKit SDKs</td><td><a href="https://github.com/livekit/client-sdk-js">Browser</a> · <a href="https://github.com/livekit/client-sdk-swift">iOS/macOS/visionOS</a> · <a href="https://github.com/livekit/client-sdk-android">Android</a> · <a href="https://github.com/livekit/client-sdk-flutter">Flutter</a> · <a href="https://github.com/livekit/client-sdk-react-native">React Native</a> · <a href="https://github.com/livekit/rust-sdks">Rust</a> · <a href="https://github.com/livekit/node-sdks">Node.js</a> · <a href="https://github.com/livekit/python-sdks">Python</a> · <a href="https://github.com/livekit/client-sdk-unity">Unity</a> · <a href="https://github.com/livekit/client-sdk-unity-web">Unity (WebGL)</a> · <a href="https://github.com/livekit/client-sdk-esp32">ESP32</a></td></tr><tr></tr>
<tr><td>Server APIs</td><td><a href="https://github.com/livekit/node-sdks">Node.js</a> · <a href="https://github.com/livekit/server-sdk-go">Golang</a> · <a href="https://github.com/livekit/server-sdk-ruby">Ruby</a> · <a href="https://github.com/livekit/server-sdk-kotlin">Java/Kotlin</a> · <a href="https://github.com/livekit/python-sdks">Python</a> · <a href="https://github.com/livekit/rust-sdks">Rust</a> · <a href="https://github.com/agence104/livekit-server-sdk-php">PHP (community)</a> · <a href="https://github.com/pabloFuente/livekit-server-sdk-dotnet">.NET (community)</a></td></tr><tr></tr>
<tr><td>UI Components</td><td><a href="https://github.com/livekit/components-js">React</a> · <b>Android Compose</b> · <a href="https://github.com/livekit/components-swift">SwiftUI</a> · <a href="https://github.com/livekit/components-flutter">Flutter</a></td></tr><tr></tr>
<tr><td>Agents Frameworks</td><td><a href="https://github.com/livekit/agents">Python</a> · <a href="https://github.com/livekit/agents-js">Node.js</a> · <a href="https://github.com/livekit/agent-playground">Playground</a></td></tr><tr></tr>
<tr><td>Services</td><td><a href="https://github.com/livekit/livekit">LiveKit server</a> · <a href="https://github.com/livekit/egress">Egress</a> · <a href="https://github.com/livekit/ingress">Ingress</a> · <a href="https://github.com/livekit/sip">SIP</a></td></tr><tr></tr>
<tr><td>Resources</td><td><a href="https://docs.livekit.io">Docs</a> · <a href="https://github.com/livekit-examples">Example apps</a> · <a href="https://livekit.io/cloud">Cloud</a> · <a href="https://docs.livekit.io/home/self-hosting/deployment">Self-hosting</a> · <a href="https://github.com/livekit/livekit-cli">CLI</a></td></tr>
</tbody>
</table>
<!--END_REPO_NAV-->
