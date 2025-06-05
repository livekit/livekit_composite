import logging
import asyncio
from enum import Enum, auto
from typing import Optional, Tuple
from livekit.agents import llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit import rtc
from ..utils import WavPlayer

logger = logging.getLogger("wake-word-handler")

class ListeningState(Enum):
    IDLE = auto()           # Not listening, waiting for wake word
    WAKE_WORD = auto()      # Just received wake word, waiting for command
    PROCESSING = auto()     # Processing the command

class WakeWordHandler:
    def __init__(self, wake_word: str = "sam", notification_sound_path: Optional[str] = None):
        self._current_state = ListeningState.IDLE
        self._wake_word = wake_word.lower()
        self._wav_player = WavPlayer() if notification_sound_path else None
        self._notification_sound_path = notification_sound_path

    @property
    def current_state(self) -> ListeningState:
        return self._current_state

    async def handle_state_transition(self, message: str, room: rtc.Room) -> Tuple[ListeningState, bool]:
        """
        Handle state transitions and return new state and whether to process message
        Returns: (new_state, should_process_message)
        """
        logger.debug(f"Current state: {self._current_state}, Message: {message}")
        
        cleaned_message = message.lower().strip()
        
        if self._wake_word in cleaned_message:
            if cleaned_message in [self._wake_word, f"{self._wake_word}.", f"{self._wake_word}?"]:
                logger.info("Wake word detected, waiting for command")
                if self._wav_player and self._notification_sound_path:
                    await self._wav_player.play_once(self._notification_sound_path, room)
                return ListeningState.WAKE_WORD, False
            logger.info("Command included with wake word, processing")
            return ListeningState.PROCESSING, True
            
        if self._current_state == ListeningState.IDLE:
            logger.debug("Ignoring message in IDLE state")
            return ListeningState.IDLE, False
            
        elif self._current_state == ListeningState.WAKE_WORD:
            logger.info("Processing command after wake word")
            return ListeningState.PROCESSING, True
            
        elif self._current_state == ListeningState.PROCESSING:
            logger.info("Returning to IDLE state")
            return ListeningState.IDLE, False
            
        return ListeningState.IDLE, False

    def _cleanup_speech_handle(self, speech_handle, description: str):
        """Helper to clean up a speech handle and all its associated futures/events"""
        if not speech_handle:
            return
            
        logger.debug(f"Cleaning up {description}: {speech_handle.id}")
        
        if hasattr(speech_handle, '_nested_speech_done_fut'):
            fut = speech_handle._nested_speech_done_fut
            if not fut.done():
                logger.debug(f"Completing nested speech future for {description}")
                fut.set_result(None)
        
        if not speech_handle.nested_speech_done:
            logger.debug(f"Marking nested speech done for {description}")
            speech_handle.mark_nested_speech_done()
            speech_handle.nested_speech_changed.set()
        
        if hasattr(speech_handle, '_done_fut') and not speech_handle._done_fut.done():
            logger.debug(f"Completing done future for {description}")
            speech_handle._done_fut.set_result(None)
            
        speech_handle.cancel(cancel_nested=True)

    async def before_llm_callback(self, agent: VoicePipelineAgent, chat_ctx: llm.ChatContext) -> Optional[bool]:
        """
        Callback to be used with VoicePipelineAgent's before_llm_cb
        Returns: 
            - None to continue processing normally
            - False to skip processing
            - True to force processing
        """
        last_message = chat_ctx.messages[-1] if chat_ctx.messages else None
        
        if last_message and last_message.role == "user":
            new_state, should_process = await self.handle_state_transition(
                last_message.content, 
                agent._room
            )
            self._current_state = new_state
            
            if not should_process:
                logger.debug("Message rejected, cleaning up pending tasks...")
                
                if agent._pending_agent_reply is not None:
                    self._cleanup_speech_handle(agent._pending_agent_reply, "pending reply")
                    agent._pending_agent_reply = None
                
                if agent._playing_speech and agent._playing_speech.allow_interruptions:
                    self._cleanup_speech_handle(agent._playing_speech, "playing speech")
                
                if hasattr(agent, '_agent_reply_task') and agent._agent_reply_task:
                    logger.debug("Canceling agent reply task")
                    agent._agent_reply_task.cancel()
                
                if self._current_state == ListeningState.WAKE_WORD:
                    chat_ctx.messages.pop()
                logger.debug(f"Not processing message in state: {self._current_state}")
                return False
                
            logger.info(f"Processing message in state: {self._current_state}")
            return None
        
        return None 
    

#### USAGE EXAMPLE ####
# import asyncio
# import logging

# from dotenv import load_dotenv
# from livekit import rtc
# from livekit.agents import (
#     AutoSubscribe,
#     JobContext,
#     JobProcess,
#     WorkerOptions,
#     cli,
#     llm,
#     metrics,
# )
# from livekit.agents.pipeline import VoicePipelineAgent
# from livekit.plugins import deepgram, openai, silero

# load_dotenv()
# logger = logging.getLogger("voice-assistant")


# def prewarm(proc: JobProcess):
#     proc.userdata["vad"] = silero.VAD.load()


# async def entrypoint(ctx: JobContext):
#     initial_ctx = llm.ChatContext().append(
#         role="system",
#         text=(
#             "You are a voice assistant created by LiveKit. Your interface with users will be voice. "
#             "You should use short and concise responses, and avoiding usage of unpronouncable punctuation."
#         ),
#     )

#     logger.info(f"connecting to room {ctx.room.name}")
#     await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

#     # wait for the first participant to connect
#     participant = await ctx.wait_for_participant()
#     logger.info(f"starting voice assistant for participant {participant.identity}")

#     agent = VoicePipelineAgent(
#         vad=ctx.proc.userdata["vad"],
#         stt=deepgram.STT(),
#         llm=openai.LLM(),
#         tts=openai.TTS(),
#         chat_ctx=initial_ctx,
#     )

#     agent.start(ctx.room, participant)

#     usage_collector = metrics.UsageCollector()

#     @agent.on("metrics_collected")
#     def _on_metrics_collected(mtrcs: metrics.AgentMetrics):
#         metrics.log_metrics(mtrcs)
#         usage_collector.collect(mtrcs)

#     async def log_usage():
#         summary = usage_collector.get_summary()
#         logger.info(f"Usage: ${summary}")

#     ctx.add_shutdown_callback(log_usage)

#     await agent.say("Hey, how can I help you today?", allow_interruptions=True)


# if __name__ == "__main__":
#     cli.run_app(
#         WorkerOptions(
#             entrypoint_fnc=entrypoint,
#             prewarm_fnc=prewarm,
#         ),
#     )