# How to detect and handle silence during calls

There are times when you may need to automatically end a call after a period of silence, such as when detecting voicemail systems. This article explains how to implement silence detection and automatic call termination.


## Implementing silence detection

You can implement silence detection using a timer that monitors user interaction. Here's a code example that disconnects the call after a specified period of silence:


```
import asyncio
import time

SILENCE_THRESHOLD = 5  # seconds

async def entrypoint(ctx: JobContext):
    user_last_spoke_time = time.time()
    monitor_task = None

    async def monitor_interaction():
        while True:
            if time.time() - user_last_spoke_time > SILENCE_THRESHOLD:
                logger.info("silent for too long! disconnecting")
                try:
                    await ctx.room.disconnect()
                except Exception as e:
                    logger.exception("Error while ending call")
            else:
                logger.trace("silence is not enough to disconnect")
            await asyncio.sleep(1)

    @agent.on("user_started_speaking")
    def on_user_started_speaking(_msg: llm.ChatMessage):
        user_last_spoke_time = time.time()

    monitor_task = asyncio.create_task(monitor_interaction())
    
    agent.start(ctx.room, participant)
    
    async def on_shutdown():
        logger.info("shutting down session")
        if monitor_task:
            monitor_task.cancel()
    ctx.add_shutdown_callback(on_shutdown)
```


## Voicemail Detection

For more comprehensive voicemail detection, particularly in outbound calling scenarios, we recommend using the [LLM-based voicemail detection method](https://docs. livekit. io/agents/quickstarts/outbound-calls/#handle-actions-with-function-calling). This approach has approximately 70-80% accuracy in detecting answering machines and voicemail systems.


> **Note:** Note: Silence detection works best as part of a broader strategy for handling voicemail systems. Consider combining it with other detection methods for better results.