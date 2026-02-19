import logging
from typing import AsyncIterable
from dataclasses import dataclass
from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    ModelSettings,
    RoomOutputOptions,
    cli,
    metrics,
    stt,
    inference,
)
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit import rtc


logger = logging.getLogger("multilingual-agent")


load_dotenv()


# Default configuration constants
DEFAULT_LANGUAGE = "eng"
DEFAULT_TTS_MODEL = "arcana"
DEFAULT_VOICE = "seraphina"


@dataclass
class LanguageConfig:
    """Configuration for TTS settings per language."""

    lang: str
    model: str = DEFAULT_TTS_MODEL


class MultilingualAgent(Agent):
    """A multilingual voice agent that detects user language and responds accordingly."""

    # TTS config per language. Keys are Rime 3-letter codes. Voice is always seraphina.
    LANGUAGE_CONFIGS = {
        "eng": LanguageConfig(lang="eng"),
        "hin": LanguageConfig(lang="hin"),
        "spa": LanguageConfig(lang="spa"),
        "ara": LanguageConfig(lang="ara"),
        "fra": LanguageConfig(lang="fra"),
        "por": LanguageConfig(lang="por"),
        "ger": LanguageConfig(lang="ger"),
        "jpn": LanguageConfig(lang="jpn"),
        "heb": LanguageConfig(lang="heb"),
        "tam": LanguageConfig(lang="tam"),
    }

    # Display names for instructions. Keys match LANGUAGE_CONFIGS.
    LANGUAGE_DISPLAY_NAMES = {
        "eng": "English",
        "hin": "Hindi",
        "spa": "Spanish",
        "ara": "Arabic",
        "fra": "French",
        "por": "Portuguese",
        "ger": "German",
        "jpn": "Japanese",
        "heb": "Hebrew",
        "tam": "Tamil",
    }

    # STT returns ISO 639-1 (e.g. "en", "es") or locale (e.g. "en-US"). Map to Rime codes.
    STT_TO_RIME = {
        "en": "eng",
        "hi": "hin",
        "es": "spa",
        "ar": "ara",
        "fr": "fra",
        "pt": "por",
        "de": "ger",
        "ja": "jpn",
        "he": "heb",
        "ta": "tam",
    }

    SUPPORTED_LANGUAGES = list(LANGUAGE_CONFIGS.keys())

    def __init__(self) -> None:
        super().__init__(instructions=self._get_instructions())
        self._current_language = DEFAULT_LANGUAGE
        self._room: rtc.Room | None = None

    def _get_instructions(self) -> str:
        """Get agent instructions in a clean, maintainable format."""
        # Build supported languages list from LANGUAGE_CONFIGS
        supported_languages = ", ".join(
            self.LANGUAGE_DISPLAY_NAMES[lang] for lang in self.SUPPORTED_LANGUAGES
        )
        return (
            "You are a voice assistant powered by Rime's text-to-speech technology. "
            "You are here to showcase Rime's natural, expressive, and multilingual voice capabilities. "
            "You respond in the same language the user speaks in. "
            f"You support {supported_languages}. "
            "If the user speaks in any other language, respond in English and politely let them know: "
            f"'I only support {supported_languages}. Please speak in one of these languages.' "
            "Keep your responses concise and to the point since this is a voice conversation. "
            "Do not use emojis, asterisks, markdown, or other special characters in your responses. "
            "You are curious, friendly, and have a sense of humor."
        )

    async def stt_node(
        self, audio: AsyncIterable[rtc.AudioFrame], model_settings: ModelSettings
    ) -> AsyncIterable[stt.SpeechEvent]:
        """
        Override STT node to detect language and update TTS configuration dynamically.

        This method intercepts speech events to detect language changes and updates
        the TTS settings to match the detected language for natural voice output.
        """
        default_stt = super().stt_node(audio, model_settings)

        async for event in default_stt:
            # Process transcript events to detect language
            if self._is_transcript_event(event):
                await self._handle_language_detection(event)

            yield event

    def _is_transcript_event(self, event: stt.SpeechEvent) -> bool:
        """Check if event is a transcript event with language information."""
        return (
            event.type
            in [
                stt.SpeechEventType.INTERIM_TRANSCRIPT,
                stt.SpeechEventType.FINAL_TRANSCRIPT,
            ]
            and event.alternatives
        )

    async def _handle_language_detection(self, event: stt.SpeechEvent) -> None:
        """Update TTS from STT-detected language and sync to frontend via participant attributes."""
        detected_language = event.alternatives[0].language
        if not detected_language:
            return
        effective_language = self._update_tts_for_language(detected_language)
        if effective_language != self._current_language:
            self._current_language = effective_language
            await self._publish_language_update(effective_language)

    def _update_tts_for_language(self, language: str) -> str:
        """Update TTS configuration based on detected language.
        
        Returns the effective Rime language code (the one actually used for TTS).
        """
        # STT may return "en", "en-US", etc. Use first segment and map to Rime code.
        base = language.split("-")[0].lower() if language else ""
        rime_lang = self.STT_TO_RIME.get(base, base) if base else DEFAULT_LANGUAGE
        # Use effective language: the resolved rime_lang if supported, otherwise default
        effective_lang = rime_lang if rime_lang in self.LANGUAGE_CONFIGS else DEFAULT_LANGUAGE
        config = self.LANGUAGE_CONFIGS.get(effective_lang, self.LANGUAGE_CONFIGS[DEFAULT_LANGUAGE])
        logger.info(f"Updating TTS: detected={language} -> rime={effective_lang}")
        self.session.tts.update_options(
            model=f"rime/{config.model}",
            language=config.lang,
        )
        return effective_lang

    async def _publish_language_update(self, language_code: str) -> None:
        """Sync current language to the frontend via participant attributes (see LiveKit docs: participant attributes)."""
        if not self._room:
            return
        try:
            display_name = self.LANGUAGE_DISPLAY_NAMES.get(language_code, "English")
            await self._room.local_participant.set_attributes({"current_language": display_name})
        except Exception as e:
            logger.warning("Failed to publish language update: %s", e)

    async def on_enter(self) -> None:
        """Called when the agent session starts. Generate initial greeting."""
        # Publish initial language so UI shows default language before any speech
        await self._publish_language_update(self._current_language)
        self.session.generate_reply(
            instructions="Greet the user and introduce yourself as a voice assistant powered by Rime's text-to-speech technology. Ask how you can help them."
        )


def prewarm(proc: JobProcess) -> None:
    """Preload VAD model for faster startup."""
    proc.userdata["vad"] = silero.VAD.load()


server = AgentServer()
server.setup_fnc = prewarm


@server.rtc_session(agent_name="rime-multilingual-agent")
async def entrypoint(ctx: JobContext) -> None:
    """Main entry point for the multilingual agent worker."""
    ctx.log_context_fields = {"room": ctx.room.name}

    # Configure session with multilingual support
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=inference.STT(model="deepgram/nova-3-general", language="multi"),
        llm=inference.LLM(model="openai/gpt-4o"),
        tts=inference.TTS(
            model=f"rime/{DEFAULT_TTS_MODEL}", voice=DEFAULT_VOICE, language=DEFAULT_LANGUAGE
        ),
        turn_detection=MultilingualModel(),
    )

    # Set up metrics collection
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent) -> None:
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage() -> None:
        """Log usage summary on shutdown."""
        summary = usage_collector.get_summary()
        logger.info(f"Usage summary: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # Start the agent session (pass room so agent can publish language updates from any context)
    agent = MultilingualAgent()
    agent._room = ctx.room
    await session.start(
        agent=agent,
        room=ctx.room,
        room_output_options=RoomOutputOptions(transcription_enabled=True),
    )


if __name__ == "__main__":
    cli.run_app(server)
