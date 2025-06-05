import asyncio
import logging
import json
import re
import copy
import os
import numpy as np
import wave
from pathlib import Path

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit import rtc
from livekit.plugins import openai, silero, cartesia, deepgram
from dotenv import load_dotenv

from audio_handler import AudioHandler

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

from assistant_functions import AssistantFnc

logger = logging.getLogger("function-calling-demo")
logger.setLevel(logging.INFO)

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
    
    async def process_message_queue():
        while True:
            text = await message_queue.get()
            await assistant.say(text)
            message_queue.task_done()

    asyncio.create_task(process_message_queue())

    async def schedule_meditation(script: dict):
        lines = script.get("script", {}).get("lines", [])
        if not lines:
            await message_queue.put("No meditation script found.")
            return

        logger.info(f"Scheduling {len(lines)} meditation instructions.")

        await audio_handler.start_audio("serene_waters.wav")

        async def schedule_line(delay: float, text: str):
            await asyncio.sleep(delay)
            await message_queue.put(text)

        tasks = []
        for line in lines:
            line_time = line.get("time", 0)
            text = line.get("text", "")
            if not isinstance(line_time, (int, float)) or not isinstance(text, str):
                logger.warning(f"Invalid line format: {line}")
                continue
            
            tasks.append(asyncio.create_task(schedule_line(line_time, text)))

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

    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=llm_instance,
        tts=cartesia.TTS(voice="03496517-369a-4db1-8236-3d3ae459ddf7"),
        fnc_ctx=fnc_ctx,
        chat_ctx=initial_chat_ctx
    )

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    await audio_handler.publish_track(ctx.room)
    
    assistant.start(ctx.room)

    await message_queue.put("Hi there, I'm your personal guided meditation assistant. How long would you like to meditate for?")

    @assistant.on("function_calls_finished")
    def on_function_calls_finished(called_fnc: AssistantFnc):
        if fnc_ctx.meditation_schedule:
            asyncio.create_task(schedule_meditation(fnc_ctx.meditation_schedule))

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))