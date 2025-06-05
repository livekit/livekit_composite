import asyncio
import logging

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    get_job_context,
)
from livekit.agents.llm import ImageContent, ChatContext, ChatMessage
from livekit.agents.voice import AgentSession, Agent, room_io
from livekit.plugins import (
    cartesia,
    openai,
    deepgram,
    noise_cancellation,
    silero,
)
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
logger = logging.getLogger("vision-agent")


class Assistant(Agent):
    def __init__(self, room: rtc.Room) -> None:
        self._latest_frame = None
        self._room = room
        self._tasks = []
        self._video_stream = None

        super().__init__(
            instructions=(
                "You are a voice assistant created by LiveKit that can both see and hear. "
                "You should use short and concise responses, avoiding unpronounceable punctuation. "
                "When you see an image in our conversation, naturally incorporate what you see "
                "into your response. Keep visual descriptions brief but informative."
            ),
            vad=silero.VAD.load(),
            stt=deepgram.STT(),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=cartesia.TTS(),
        )

    async def on_enter(self):
        """
        Lifecycle hook that runs after the agent becomes the active agent in a session.
        Adds video track from a remote participant and then starts tracking frames from video.
        """
        logger.debug("Agent joining room")
        room = get_job_context().room

        # Find the first video track (if any) from the remote participant
        remote_participant = list(room.remote_participants.values())[0]
        video_tracks = [
            publication.track
            for publication in remote_participant.track_publications.values()
            if publication.track is not None
            and publication.track.kind == rtc.TrackKind.KIND_VIDEO
        ]
        if video_tracks:
            self._create_video_stream(video_tracks[0])

        # Watch for new video tracks not yet published
        @room.on("track_subscribed")
        def on_track_subscribed(track: rtc.Track):
            logger.debug("New video track subscribed")
            if track.kind == rtc.TrackKind.KIND_VIDEO:
                self._create_video_stream(track)

    async def on_user_turn_completed(
        self, _: ChatContext, new_message: ChatMessage
    ) -> None:
        """
        Lifecycle hook that runs after the user's turn has ended, before the agent's reply.
        Captures the latest video frame and adds it to the conversation context.
        """
        if self._latest_frame:
            new_message.content.append(ImageContent(image=self._latest_frame))
            logger.debug("Added latest frame to conversation context")
            self._latest_frame = None

    def _create_video_stream(self, track: rtc.Track):
        """
        Helper method to buffer the latest video frame from the user's track
        """
        # Close any existing stream (we only want one at a time)
        if self._video_stream is not None:
            self._video_stream.close()

        # Create a new stream to receive frames
        self._video_stream = rtc.VideoStream(track)

        async def read_stream():
            async for event in self._video_stream:
                # Store the latest frame for use later
                self._latest_frame = event.frame

        # Store the async task
        task = asyncio.create_task(read_stream())
        task.add_done_callback(lambda t: self._tasks.remove(t))
        self._tasks.append(task)


async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    # Wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    session = AgentSession(
        min_endpointing_delay=0.5,
        max_endpointing_delay=5.0,
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(ctx.room),
        room_input_options=room_io.RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # The agent should be polite and greet the user when it joins :)
    await session.say("Hey, how can I help you today?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
