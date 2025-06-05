### Before running the agent, you need to build the RAG database:
### ~ python build_data.py

import logging
from typing import Annotated
from pathlib import Path
from livekit import rtc

from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import deepgram, openai, silero
from agent_extensions.rag import RAGHandler
from agent_extensions.utils import WavPlayer

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

logger = logging.getLogger("rag-assistant")

async def entrypoint(ctx: JobContext) -> None:
    """
    Main entrypoint for the agent. Sets up function context, defines
    RAG enrichment command, creates the agent's initial conversation context,
    and starts the agent.
    """
    agent = VoicePipelineAgent(
        chat_ctx=llm.ChatContext().append(
            role="system",
            text=(
                "You are a voice assistant created by LiveKit. Your interface with users will be voice. "
                "Keep responses short and concise. Avoid unpronounceable punctuation. "
                "Use any provided context to answer the user's question if needed."
                "Never start a sentence with phrases like 'Sure' or 'I can do that' or 'I can help with that'. Instead, just start with the answer."
            ),
        ),
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai.LLM(),
        tts=openai.TTS(),
        fnc_ctx=llm.FunctionContext(),
    )

    # Set up RAG handler with message-based thinking style
    rag_handler = RAGHandler(
        index_path="vdb_data",
        data_path="my_data.pkl",
        thinking_style="message",  # Could also use "llm", "audio", or "none"
        # thinking_audio_path="let_me_check_that.wav"  # Uncomment to use audio style
    )
    rag_handler.start(agent)

    # Connect and start the agent
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    agent.start(ctx.room)
    await agent.say("Hey, how can I help you today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))