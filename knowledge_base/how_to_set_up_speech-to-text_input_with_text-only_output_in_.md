# How to Set Up Speech-to-Text Input with Text-Only Output in LiveKit Agents

You can configure a LiveKit Agent to accept audio input (speech-to-text) while responding only with text. Here's how to set it up and receive the responses:


## Configuration

1. Disable audio output by setting `audio_enabled=False` in `RoomOutputOptions`

2. The agent will publish text responses to the `lk. transcription` text stream topic, without a `lk. transcribed_track_id` attribute


## Receiving Agent Responses

To receive the agent's text responses, you need to listen to the `lk. transcription` text stream topic. The built-in playground UI uses legacy transcription events and won't display responses when audio track publishing is disabled.


## Example Implementation

You can find example implementations here:


- Speech-to-text agent setup: [Transcriber Example](https://github. com/livekit/agents/blob/main/examples/other/transcription/transcriber. py)
- Text stream receiver: [Chat Stream Receiver Example](https://github. com/livekit/agents/blob/livekit-agents@1.2.0/examples/other/chat-stream-receiver. py)

**Note:** If you're using the console playground and don't see agent responses to audio input, this is expected behavior. You must implement a custom receiver to listen to the `lk. transcription` text stream topic.