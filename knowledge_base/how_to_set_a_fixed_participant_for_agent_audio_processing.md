# How to set a fixed participant for agent audio processing

When using an agent with LiveKit rooms containing multiple participants, you can specify which participant's audio track the agent should process for speech-to-text (STT) conversion.


## Setting a Fixed Participant

Use the RoomIO constructor to specify a fixed participant identity when initializing your agent session:


```
session = AgentSession(llm=openai.realtime.RealtimeModel())
room_io = RoomIO(session, room=ctx.room, participant="participant-identity")
await room_io.start()
await session.start(agent=MyAgent())
```

Note: RoomIO is automatically used whenever an agent interacts with a LiveKit room. If you don't explicitly create a RoomIO instance, a default one will be created when calling `session. start(agent, room=room)`.

By setting the `participant` parameter in the RoomIO constructor, the agent will only process audio from the specified participant identity, rather than switching between different participants in the room.