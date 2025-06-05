import logging
from typing import AsyncIterable
from dotenv import load_dotenv
from pathlib import Path
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
    metrics,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero

load_dotenv(dotenv_path=Path(__file__).parent / '.env')
logger = logging.getLogger("voice-assistant")

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a voice assistant created by LiveKit. Your interface with users will be voice. "
            "You should use short and concise responses, and avoiding usage of unpronouncable punctuation."
        ),
    )

    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    async def _before_tts_cb(agent: VoicePipelineAgent, text: str | AsyncIterable[str]):
        if isinstance(text, str):
            result = text.replace("<think>", "").replace("</think>", "")
            return result
        else:
            async def process_stream():
                async for chunk in text:
                    processed = chunk.replace("<think>", "")\
                        .replace("</think>", "Okay, I'm ready to respond.")

                    yield processed
            
            return process_stream()
    
    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=openai.STT.with_groq(),
        llm=openai.LLM.with_groq(model="deepseek-r1-distill-llama-70b"),
        tts=openai.TTS(),
        before_tts_cb=_before_tts_cb,
        chat_ctx=initial_ctx
    )

    agent.start(ctx.room, participant)
    await agent.say("Hey how can I help you today?")

    usage_collector = metrics.UsageCollector()

    @agent.on("metrics_collected")
    def _on_metrics_collected(mtrcs: metrics.AgentMetrics):
        metrics.log_metrics(mtrcs)
        usage_collector.collect(mtrcs)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: ${summary}")

    ctx.add_shutdown_callback(log_usage)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )