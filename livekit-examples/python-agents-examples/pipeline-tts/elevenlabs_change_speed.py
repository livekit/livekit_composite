import logging
from pathlib import Path
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.llm import function_tool
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import deepgram, openai, elevenlabs, silero

logger = logging.getLogger("speed-switcher")
logger.setLevel(logging.INFO)

load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

class SpeedSwitcherAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
                You are a helpful assistant communicating through voice. 
                You can change the speed of your voice if asked.
                Don't use any unpronouncable characters.
            """,
            stt=deepgram.STT(
                model="nova-3",
                language="en"
            ),
            llm=openai.LLM(model="gpt-4o"),
            tts=elevenlabs.TTS(
                model="eleven_turbo_v2_5",
                voice_settings=elevenlabs.VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.75,
                    speed=1.0
                )
            ),
            vad=silero.VAD.load()
        )
        self.current_speed = 1.0
        
        self.speed_names = {
            0.7: "slow",
            0.85: "slightly slow", 
            1.0: "normal",
            1.15: "slightly fast",
            1.2: "fast"
        }
        
        self.speed_messages = {
            0.7: "I'm now speaking at a slow pace. How can I help you today?",
            1.0: "I'm now speaking at normal speed. How can I help you today?",
            1.2: "I'm now speaking at a fast pace. How can I help you today?"
        }

    async def on_enter(self):
        await self.session.say(f"Hi there! I can change the speed of my voice. I can speak slowly, normal speed, or fast. Just ask me to change my speaking speed. How can I help you today?")

    async def _change_speed(self, speed: float) -> None:
        """Helper method to change the voice speed"""
        if speed == self.current_speed:
            await self.session.say(f"I'm already speaking at {self.speed_names[speed]} speed.")
            return
        
        if self.tts is not None:
            self.tts.update_options(voice_settings=elevenlabs.VoiceSettings(
                stability=0.5,
                similarity_boost=0.75,
                speed=speed
            ))
        
        self.current_speed = speed
        
        await self.session.say(self.speed_messages[speed])

    @function_tool
    async def speak_slowly(self):
        """Change to speaking slowly (0.7x speed)"""
        await self._change_speed(0.7)
    
    @function_tool
    async def speak_normal(self):
        """Change to speaking at normal speed (1.0x speed)"""
        await self._change_speed(1.0)
        
    @function_tool
    async def speak_fast(self):
        """Change to speaking fast (1.2x speed)"""
        await self._change_speed(1.2)


async def entrypoint(ctx: JobContext):
    session = AgentSession()

    await session.start(
        agent=SpeedSwitcherAgent(),
        room=ctx.room
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint)) 