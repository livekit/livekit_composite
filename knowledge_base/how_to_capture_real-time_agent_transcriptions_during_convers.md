# How to capture real-time agent transcriptions during conversations

When building conversation history features, there are several ways to capture agent transcriptions in real-time, even when users disconnect mid-conversation.


## Using conversation_item_added Events

The simplest approach is to use the `conversation_item_added` event. In the latest agent version, with `RoomInputOptions. close_on_disconnect` enabled (enabled by default), you'll receive the incomplete agent turn immediately when a user leaves the room.


## Manual Session Closure

Alternatively, you can manually trigger the capture of an incomplete agent turn by calling:


```
await session.aclose()
```

This will stop the agent and flush any incomplete agent turn.


## Real-time Transcription Options

For more granular real-time transcription:


1. Use the `transcription_node` to collect transcripts as they are generated
2. For TTS-aligned transcriptions, you can implement solutions using Cartesia or ElevenLabs (note: this feature is not available with NovaSonic)

For detailed implementation of TTS-aligned transcriptions, refer to our [documentation on TTS-aligned transcriptions](https://docs. livekit. io/agents/build/text/#tts-aligned-transcriptions).