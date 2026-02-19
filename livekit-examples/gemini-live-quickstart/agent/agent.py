import logging
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google

load_dotenv(".env.local")

logger = logging.getLogger(__name__)

# Customize the agent's persona by modifying this variable
PERSONA_INSTRUCTIONS = """You are a helpful assistant that can see through the user's camera. Be concise and conversational."""

class VisionAgent(Agent):
    BASE_VIDEO_AWARENESS = """IMPORTANT: You can only see video when the user enables their camera or screenshare.

When asked to describe what you see:
- If you don't have any visual information in the current context, tell them you need them to enable their camera or start a screenshare first.
- Only describe what you can actually see in the provided video frames.
- Never make up or assume visual details that aren't present.
"""
    
    def __init__(self, persona_instructions: str = "You are a helpful assistant.") -> None:
        full_instructions = f"{self.BASE_VIDEO_AWARENESS}\n\n{persona_instructions}"
        super().__init__(instructions=full_instructions)

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    has_video = False
    
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        nonlocal has_video
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            has_video = True
            logger.info(f"Video track subscribed from {participant.identity}")
    
    def on_track_unsubscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        nonlocal has_video
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            # Check if there are any other video tracks
            has_video = any(
                pub.track and pub.track.kind == rtc.TrackKind.KIND_VIDEO
                for p in ctx.room.remote_participants.values()
                for pub in p.track_publications.values()
                if pub.subscribed
            )
            logger.info(f"Video track unsubscribed from {participant.identity}, has_video={has_video}")
    
    # Subscribe to track events
    ctx.room.on("track_subscribed", on_track_subscribed)
    ctx.room.on("track_unsubscribed", on_track_unsubscribed)
    
    # Check for existing video tracks
    for participant in ctx.room.remote_participants.values():
        for publication in participant.track_publications.values():
            if publication.subscribed and publication.track and publication.track.kind == rtc.TrackKind.KIND_VIDEO:
                has_video = True
                break

    # Gemini Live API includes built-in VAD-based turn detection (enabled by default)
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Aoede",
        ),
    )

    await session.start(
        room=ctx.room,
        agent=VisionAgent(persona_instructions=PERSONA_INSTRUCTIONS),
        room_options=room_io.RoomOptions(
            video_input=True,
        ),
    )

    # Generate initial greeting
    if has_video:
        await session.generate_reply(
            instructions="Greet the user and let them know you can see their video feed."
        )
    else:
        await session.generate_reply(
            instructions="Greet the user and let them know you're ready to help. Mention that they can enable their camera or screenshare if they want you to see something."
        )

if __name__ == "__main__":
    agents.cli.run_app(server)
