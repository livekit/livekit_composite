import logging
import base64
import os
import aiohttp

from dotenv import load_dotenv
from livekit.agents import (
    NOT_GIVEN,
    Agent,
    AgentFalseInterruptionEvent,
    AgentSession,
    AgentTask,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    RoomInputOptions,
    RunContext,
    WorkerOptions,
    cli,
    metrics,
    mcp,
    llm,
    stt,
    tts
)
from livekit.agents.llm import function_tool
from livekit.agents.telemetry import set_tracer_provider
from livekit.plugins import cartesia, deepgram, noise_cancellation, openai, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")


def setup_langfuse(
    host: str | None = None, public_key: str | None = None, secret_key: str | None = None
):
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY")
    host = host or os.getenv("LANGFUSE_HOST")

    if not public_key or not secret_key or not host:
        raise ValueError("LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and LANGFUSE_HOST must be set")

    langfuse_auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = f"{host.rstrip('/')}/api/public/otel"
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Basic {langfuse_auth}"

    trace_provider = TracerProvider()
    trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    set_tracer_provider(trace_provider)


class CollectConsent(AgentTask[bool]):
    def __init__(self, chat_ctx=None):
        super().__init__(
            instructions="""Ask for recording consent and get a clear yes or no answer.
            Be polite and professional when asking for consent.""",
            chat_ctx=chat_ctx
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="""Politely ask the user for permission to record this call for 
            quality assurance and training purposes. Make it clear that they can decline."""
        )

    @function_tool
    async def consent_given(self) -> None:
        """Use this when the user gives consent to record."""
        logger.info("User gave consent to record")
        self.complete(True)

    @function_tool
    async def consent_denied(self) -> None:
        """Use this when the user denies consent to record."""
        logger.info("User denied consent to record")
        self.complete(False)


class FeedbackAgent(Agent):
    def __init__(self, chat_ctx=None):
        super().__init__(
            instructions="""You are a feedback collector. Your job is to collect a rating 
            from 1 to 10 about the user's experience with the call. Be friendly and grateful.
            Once you have collected the rating, thank them and say goodbye.""",
            chat_ctx=chat_ctx
        )
        self.rating = None

    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="""Thank the user for their time and ask them to rate their experience 
            on a scale from 1 to 10, where 1 is poor and 10 is excellent."""
        )

    @function_tool
    async def record_rating(self, context: RunContext, rating: int):
        """Use this tool to record the user's rating from 1 to 10.
        
        Args:
            rating: The user's rating from 1 to 10
        """
        if rating < 1 or rating > 10:
            return "Please provide a rating between 1 and 10."
        
        self.rating = rating
        logger.info(f"User rated the interaction: {rating}/10")
        
        if rating >= 7:
            await self.session.generate_reply(
                instructions="Thank them for the positive feedback and say goodbye warmly."
            )
        else:
            await self.session.generate_reply(
                instructions="""Acknowledge their feedback, apologize for any inconvenience, 
                and assure them their feedback will help improve the service. Then say goodbye."""
            )
        
        return f"Rating recorded: {rating}/10"


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a helpful voice AI assistant.
            You eagerly assist users with their questions by providing information from your extensive knowledge.
            Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
            You are curious, friendly, and have a sense of humor.""",
        )
    
    async def on_enter(self) -> None:
        from livekit.agents import get_job_context
        
        # Collect consent before proceeding with the main conversation
        consent_given = await CollectConsent(chat_ctx=self.chat_ctx)
        
        if consent_given:
            logger.info("User consented to recording, proceeding with conversation")
            await self.session.generate_reply(
                instructions="""The user has consented to recording. Now greet them warmly and 
                offer your assistance with any questions they may have."""
            )
        else:
            logger.info("User did not consent to recording, ending call")
            await self.session.say("Since consent is required to continue this call, we're unable to help you. Goodbye!")
            job_ctx = get_job_context()
            await job_ctx.shutdown(reason="Recording consent not given")

    @function_tool
    async def end_call(self, context: RunContext):
        """Use this when the user wants to end the call or finish the conversation."""
        logger.info("User requested to end the call, transferring to feedback agent")
        return "Transferring to collect feedback", FeedbackAgent(chat_ctx=self.chat_ctx)

    @function_tool
    async def lookup_weather(self, context: RunContext, location: str):
        """Use this tool to look up current weather information in the given location.

        If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.

        Args:
            location: The location to look up weather information for (e.g. city name)
        """

        logger.info(f"Looking up weather for {location}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://shayne.app/weather?location={location}") as response:
                    if response.status == 200:
                        data = await response.json()
                        condition = data.get("condition", "unknown")
                        temperature = data.get("temperature", "unknown")
                        unit = data.get("unit", "degrees")
                        return f"{condition} with a temperature of {temperature} {unit}"
                    else:
                        logger.error(f"Weather API returned status {response.status}")
                        return "Weather information is currently unavailable for this location."
        except Exception as e:
            logger.error(f"Error fetching weather: {e}")
            return "Weather service is temporarily unavailable."


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    setup_langfuse()
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    session = AgentSession(
        llm=llm.FallbackAdapter(
            [
                openai.LLM(model="gpt-4o-mini"),
                openai.LLM(model="gpt-4.1"),
            ]
        ),
        stt=stt.FallbackAdapter(
            [
                deepgram.STT(filler_words=True),
                openai.STT(),
            ],
            vad=ctx.proc.userdata["vad"],
        ),
        tts=tts.FallbackAdapter(
            [
                deepgram.TTS(),
                openai.TTS(),
            ]
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
        mcp_servers=[
            mcp.MCPServerHTTP(url="https://shayne.app/sse"),
        ],
    )

    @session.on("agent_false_interruption")
    def _on_agent_false_interruption(ev: AgentFalseInterruptionEvent):
        logger.info("false positive interruption, resuming")
        session.generate_reply(instructions=ev.extra_instructions or NOT_GIVEN)

    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
