import os
import logging
import asyncio
from dotenv import load_dotenv
from signal import SIGINT, SIGTERM
from livekit import rtc
import pyaudio
from auth import generate_token

load_dotenv()
# ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in your .env file
LIVEKIT_URL = os.environ.get("LIVEKIT_URL")
ROOM_NAME = os.environ.get("ROOM_NAME")

# default audio settings
SAMPLE_RATE = 48000
NUM_CHANNELS = 1

async def main(room: rtc.Room):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # init audio stream
    pa = pyaudio.PyAudio()

    audio_stream = pa.open(format=pyaudio.paInt16,
                channels=NUM_CHANNELS,
                rate=SAMPLE_RATE,
                output=True,
                output_device_index=1)


    async def receive_audio_frames(stream: rtc.AudioStream):
        async for frame in stream:
            audio_stream.write(frame.frame.data.tobytes())
            pass

    # track_subscribed is emitted whenever the local participant is subscribed to a new track
    @room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        logger.info("track subscribed: %s", publication.sid)
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            audio_stream = rtc.AudioStream(track)
            asyncio.ensure_future(receive_audio_frames(audio_stream))

    @room.on("track_published")
    def on_track_published(
        publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant
    ):
        logging.info(
            "track published: %s from participant %s (%s)",
            publication.sid,
            participant.sid,
            participant.identity,
        )

    # By default, autosubscribe is enabled. The participant will be subscribed to
    # all published tracks in the room
    token = generate_token(ROOM_NAME, "audio-receiver", "Audio Receiver")
    await room.connect(LIVEKIT_URL, token)
    logger.info("connected to room %s", room.name)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        handlers=[
            logging.FileHandler("receive_audio.log"),
            logging.StreamHandler(),
        ],
    )

    loop = asyncio.get_event_loop()
    room = rtc.Room(loop=loop)

    async def cleanup():
        try:
            await room.disconnect()
        except:
            pass
        task = asyncio.current_task()
        tasks = [t for t in asyncio.all_tasks() if t is not task]
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        loop.stop()

    asyncio.ensure_future(main(room))
    for signal in [SIGINT, SIGTERM]:
        loop.add_signal_handler(signal, lambda: asyncio.ensure_future(cleanup()))

    try:
        loop.run_forever()
    finally:
        loop.close()
