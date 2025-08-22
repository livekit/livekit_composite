# How to detect when an agent has finished speaking

When working with Text-to-Speech (TTS) audio in the agent system, you may need to detect when an agent has completely finished speaking. There are two main approaches to handle this:


## Using the PlaybackFinished Event (Recommended)

The most accurate way to detect when an agent has finished speaking is to use the `playback_finished` event from the AudioOutput in the agent:


```
from livekit.agents.voice.io import PlaybackFinishedEvent

@session.output.audio.on("playback_finished")
def _on_playback_finished(ev: PlaybackFinishedEvent):
    logger.info(f"playback finished: {ev.interrupted}")

```

Note: The `session. output. audio` will be None before the session starts or before manually starting the RoomIO.


## Making the Event Available to Web Clients

To make this information available to web clients, you'll need to implement an RPC (Remote Procedure Call) in your agent to broadcast the playback finished event to the room. Web clients can then listen for this RPC event to know when the agent has finished speaking.


> **Note:** The `final` parameter in the transcription listener does not indicate that the audio has finished playing - it only indicates that the transcription is complete. For accurate playback completion detection, use the `playback_finished` event.