# Understanding Transcript Timing in Voice Conversations

When working with voice conversations that include both user and AI agent speech, you may need to track the timing of each segment in the transcript. Here's what you need to know about transcript timing and available options.


## Current Functionality

When using the `transcription_node` with non-streaming TTS providers (like OpenAI TTS), the system currently:


- Provides start times for each sentence
- Does not provide explicit end times (`chunk. end_time` will show as `NOT_GIVEN`)
- The start time of the next sentence can be used as the end time of the previous sentence


## Getting Complete Transcripts

To get a complete transcript with both user and AI speech:


- AI agent transcripts can be obtained from the `transcription_node`
- User transcripts are available through the `user_input_transcribed` event


> **Note:** Full transcript timing support with explicit start and end times for both user and AI speech segments is currently in development. This will allow for precise alignment with egress video timing.


## Example Desired Output Format


```
{
  "transcript": [
    {
      "start_time": "00:00",
      "end_time": "00:04",
      "text": "Hi. Thanks so much for joining me today.",
      "role": "AI"
    },
    {
      "start_time": "00:11",
      "end_time": "00:15",
      "text": "I know me look online and online gift recommendations.",
      "role": "User"
    }
  ]
}
```