---
title: Building a Guided Meditation Assistant
description: Build an AI-powered meditation assistant that creates personalized guided meditation sessions with background music.
---

In this recipe, build a voice-interactive meditation assistant that asks how long you’d like to meditate, generates a custom script, and plays background music. This guide focuses on how to schedule meditation messages, handle TTS, and manage audio playback.

## Prerequisites

To complete this guide, you need to create an agent using the [Voice Agent quickstart](https://docs.livekit.io/agents/quickstarts/voice-agent).

## Setting up the audio handler

Use a custom AudioHandler class to manage background audio playback. You can find an example implementation in the [AudioHandler Class](https://github.com/ShayneP/meditation-assistant/blob/main/audio_handler.py). Save it alongside your agent code, then import it:

```python
from audio_handler import AudioHandler
```

## Managing message scheduling

The following code queues up meditation instructions and delivers them at the right times:

```python
message_queue = asyncio.Queue()

async def process_message_queue():
    while True:
        text = await message_queue.get()
        await assistant.say(text)
        message_queue.task_done()

async def schedule_meditation(script: dict):
    lines = script.get("script", {}).get("lines", [])
    if not lines:
        await message_queue.put("No meditation script found.")
        return

    await audio_handler.start_audio("serene_waters.wav")

    async def schedule_line(delay: float, text: str):
        await asyncio.sleep(delay)
        await message_queue.put(text)

    tasks = []
    for line in lines:
        line_time = line.get("time", 0)
        text = line.get("text", "")
        tasks.append(asyncio.create_task(schedule_line(line_time, text)))

    # Add closing message
    final_time = lines[-1].get("time", 0) + 10
    tasks.append(
        asyncio.create_task(
            schedule_line(
                final_time, 
                "Meditation session has ended, thanks so much for joining me. Take a moment to notice how you feel, and I'll see you next time."
            )
        )
    )

    try:
        await asyncio.gather(*tasks)
    finally:
        await audio_handler.stop_audio()
```

## Initializing the VoicePipelineAgent

Set up an instance of `VoicePipelineAgent` with the necessary components and initial context:

```python
initial_chat_ctx = llm.ChatContext()
initial_chat_ctx.messages.append(
    llm.ChatMessage(
        content="You are a guided meditation assistant. Your interface with users will be voice. You can build meditations that are specific to the user's needs.",
        role="system",
    )
)

agent = VoicePipelineAgent(
    vad=silero.VAD.load(),
    stt=deepgram.STT(),
    llm=openai.LLM(),
    tts=cartesia.TTS(voice="03496517-369a-4db1-8236-3d3ae459ddf7"),
    fnc_ctx=fnc_ctx,
    chat_ctx=initial_chat_ctx
)
```

## Handling meditation generation

When the LLM finishes generating a meditation script, trigger our scheduling logic:

```python
@agent.on("function_calls_finished")
def on_function_calls_finished(called_fnc: AssistantFnc):
    if fnc_ctx.meditation_schedule:
        asyncio.create_task(schedule_meditation(fnc_ctx.meditation_schedule))
```

## Starting the agent

Below is our entrypoint, which wires everything together:

```python
async def entrypoint(ctx: JobContext):
    audio_handler = AudioHandler()
    
    llm_instance = openai.LLM.with_cerebras(model="llama3.1-70b")
    fnc_ctx = AssistantFnc(llm_instance=llm_instance)

    initial_chat_ctx = llm.ChatContext()
    initial_chat_ctx.messages.append(
        llm.ChatMessage(
            content="You are a guided meditation assistant. Your interface with users will be voice. You can build meditations that are specific to the user's needs.",
            role="system",
        )
    )

    message_queue = asyncio.Queue()
    asyncio.create_task(process_message_queue())

    agent = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=llm_instance,
        tts=cartesia.TTS(voice="03496517-369a-4db1-8236-3d3ae459ddf7"),
        fnc_ctx=fnc_ctx,
        chat_ctx=initial_chat_ctx
    )

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    await audio_handler.publish_track(ctx.room)
    
    agent.start(ctx.room)

    await message_queue.put("Hi there, I'm your personal guided meditation assistant. How long would you like to meditate for?")

    @assistant.on("function_calls_finished")
    def on_function_calls_finished(called_fnc: AssistantFnc):
        if fnc_ctx.meditation_schedule:
            asyncio.create_task(schedule_meditation(fnc_ctx.meditation_schedule))

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

For a full example, see the [Meditation Assistant repository](https://github.com/ShayneP/meditation-assistant).
