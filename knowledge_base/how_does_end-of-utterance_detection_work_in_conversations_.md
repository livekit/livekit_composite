# How does end-of-utterance detection work in conversations?

**End-of-utterance (EOU)** detection determines when a user has finished speaking, enabling natural turn-taking in voice conversations. This prevents agents from interrupting users mid-sentence while maintaining responsive interactions.


## How It Works

LiveKit Agents uses a multi-layered approach combining Voice Activity Detection (VAD) with optional specialized turn detection models:


### 1. Voice Activity Detection

VAD detects speech start/stop events by monitoring audio for sustained silence. The `min_silence_duration` parameter controls the silence threshold required before considering speech ended.


### 2. Turn Detection Modes

The system supports multiple turn detection strategies:

- **`"vad"`** - Uses VAD silence detection (default fallback)

- **`"stt"`** - Uses speech-to-text end-of-speech signals

- **`"realtime_llm"`** - Uses server-side detection from realtime models

- **Custom model** - Uses specialized EOU detection models


### 3. Endpointing Delays

After detecting a potential turn end, the system waits before responding:

- **High confidence**: Waits `min_endpointing_delay` (default: 0.5s)

- **Low confidence**: Waits `max_endpointing_delay` (default: 6.0s)


### 4. Automatic Fallback

If no turn detection is explicitly configured, the system automatically selects the best available mode. It [prioritizes](https://github. com/livekit/agents/blob/main/livekit-agents/livekit/agents/voice/agent_session. py#L64-L77) `realtime_llm → vad → stt → manual` based on available components.


## Configuration

Turn detection is configured at the session or agent level:


### Session-level configuration


## Notes

The turn detection system is implemented in the `AudioRecognition` class, which coordinates between VAD events, STT transcripts, and optional turn detection models. The `AgentActivity` class handles the logic for selecting appropriate turn detection modes based on available components. LiveKit also offers a custom [turn detector model](https://docs. livekit. io/agents/build/turns/turn-detector/) that can be leveraged as a [plugin](https://github. com/livekit/agents/blob/main/livekit-plugins/livekit-plugins-turn-detector/README. md).


## Performance and Accuracy

The turn detection model is trained on multi-turn conversations between humans and assistants, achieving:


- 98.8% accuracy in identifying completed turns (true positive rate)
- 87.5% accuracy in identifying incomplete utterances (true negative rate)


> **Note:** While the model considers punctuation as one signal, it is designed to be robust against speech-to-text variances like missing or incorrect punctuation.


## Configuration

You can adjust multiple parameters (see [EOU configuration parameters](https://docs. livekit. io/agents/build/turns/#session-configuration) and [VAD configuration parameters](https://docs. livekit. io/agents/build/turns/vad/#configuration)).