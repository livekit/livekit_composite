# How does end-of-utterance detection work in conversations?

Our end-of-utterance (EOU) detection system uses a combination of Voice Activity Detection (VAD) and a specialized turn detection model to determine when a user has finished speaking. This helps create more natural conversational interactions by avoiding premature interruptions.


## How it works


1. The system first detects sustained silence using VAD`min_silence_duration` can be used to lower the threshold required for a gap to be considered enough silence
2. Upon receiving a final transcript, the turn detection model evaluates whether the user has completed their turn
3. Based on the model's confidence: High confidence: System waits for `min_endpointing_delay` (default: 0.5 seconds) before respondingLow confidence: System waits for `max_endpointing_delay` (default: 6.0 seconds) before responding


## Performance and Accuracy

The turn detection model is trained on multi-turn conversations between humans and assistants, achieving:


- 98.8% accuracy in identifying completed turns (true positive rate)
- 87.5% accuracy in identifying incomplete utterances (true negative rate)


> **Note:** While the model considers punctuation as one signal, it is designed to be robust against speech-to-text variances like missing or incorrect punctuation.


## Configuration

You can adjust multiple parameters (see [EOU configuration parameters](https://docs. livekit. io/agents/build/turns/#session-configuration) and [VAD configuration parameters](https://docs. livekit. io/agents/build/turns/vad/#configuration)).