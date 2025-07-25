# Agents Example Unity

This example showcases how to integrate a voice agent built with [LiveKit Agents](https://docs.livekit.io/agents/overview/) into a Unity project using the [LiveKit Unity SDK](https://github.com/livekit/client-sdk-unity), attaching the agent's voice and transcriptions to a world object.

## Quick start

1. **Setup your agent**: If you don't already have an agent to work with, you can follow the [Voice AI Quickstart](https://docs.livekit.io/agents/start/voice-ai/) to build a simple voice agent in less than 10 minutes.

2. **Clone repository**:

```sh
git clone https://github.com/livekit-examples/agents-example-unity.git
```

3. **Add Project to Unity Hub**: From the Unity Hub, click "Add" and select "Add project from disk." Navigate to the cloned repository, and choose the "AgentsExample" subdirectory (this is the Unity project root).

> [!NOTE]
> When opening the project for the first time, it may take a few minutes to resolve the LiveKit SDK package.

4. **Sandbox Token Server**: Create a new [Sandbox Token Server](https://cloud.livekit.io/projects/p_/sandbox/templates/token-server) for your LiveKit Cloud project and take note of its ID. With the Unity project open, select [`SandboxAuth`](/AgentsExample/Assets/SandboxAuth.asset) in the "Assets" directory. From the inspector, fill in the ID of your sandbox token server.

5. **Enter Play Mode**: Click the play button at the top of the Unity Editor to start the application.

## Token generation

In a production environment, you will be responsible for developing a solution to [generate tokens for your users](https://docs.livekit.io/home/server/generating-tokens/) which is integrated with your authentication solution. You should disable your sandbox token server and modify [`TokenService.cs`](/AgentsExample/Assets/Scripts/TokenService.cs) to use your own token server.

## Development

This project is configured to work out-of-the-box in Visual Studio Code for development, providing IntelliSense and the ability to attach to the Unity debugger. To use this configuration, open the "AgentsExample" directory in Visual Studio Code. Install the recommended extensions when prompted.

### Debugging

To debug, ensure Unity is running in Play mode, then use the "Attach to Unity" debug configuration.
