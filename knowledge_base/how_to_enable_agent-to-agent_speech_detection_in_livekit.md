# How to Enable Agent-to-Agent Speech Detection in LiveKit

By default, LiveKit agents cannot detect speech from other agents in the same room. To enable agent-to-agent conversations where agents can hear and respond to each other, you'll need to configure the RoomInputOptions.


## Configuring Agent Speech Detection

Add the following configuration to enable speech detection between agents:


```
RoomInputOptions.participant_kinds = [rtc.ParticipantKind.PARTICIPANT_KIND_AGENT]
```

This setting allows agents to:


- Detect speech from other agents in the same room
- Process other agents' speech as input
- Maintain two-way conversations with other agents


> **Note:** Remember that both agents must still successfully connect to the room and have Text-to-Speech (TTS) properly configured for the conversation to work.