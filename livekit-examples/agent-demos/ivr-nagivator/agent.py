from __future__ import annotations
import os
import time

import asyncio
import logging
from typing import Annotated

import aiohttp
from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    JobProcess,
    cli,
    llm,
)
from pathlib import Path
from livekit import rtc, api
from livekit.rtc import Participant
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero, cartesia, deepgram

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

logger = logging.getLogger("my-worker")
logger.setLevel(logging.INFO)

def prewarm(proc: JobProcess): 
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    logger.info("starting entrypoint")

    fnc_ctx = llm.FunctionContext()
    last_dtmf_press = 0  # Track the last DTMF press timestamp

    @fnc_ctx.ai_callable()
    async def send_dtmf_code(
        code: Annotated[
            int, llm.TypeInfo(description="The DTMF code to send to the phone number for the current step.")
        ],
    ):
        """Called when you need to send a DTMF code to the phone number for the current step."""
        nonlocal last_dtmf_press
        current_time = time.time()
        
        # Check if enough time has passed since last press (3 second cooldown)
        if current_time - last_dtmf_press < 3:
            logger.info("DTMF code rejected due to cooldown")
            return None
            
        logger.info(f"Sending DTMF code {code} to the phone number for the current step.")
        last_dtmf_press = current_time
        
        await ctx.room.local_participant.publish_dtmf(
            code=code,
            digit=str(code)
        )
        await ctx.room.local_participant.publish_data(
            f"{code}",
            topic="dtmf_code"
        )
        if code != 0:
            return None
        else:
            return None

    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=openai.LLM(),
        tts=cartesia.TTS(),
        fnc_ctx=fnc_ctx,
        min_endpointing_delay=0.75
    )

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info(f"new participant joined {participant.identity}")
        if "sip_" in participant.identity:
            task = participant._info.attributes.get("task")
            logger.info(f"task: {task}")
            agent.chat_ctx.append(
                role="system",
                text=(
                    f"""
                    You are a person who is calling a phone number to accomplish a task.
                    Speak from the perspective of the caller. 
                    Your goal as the caller is to: {task}.
                    Listen carefully and pick the most appropriate option from the IVR menu.
                    """
                )
            )
            agent.start(ctx.room, participant)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )