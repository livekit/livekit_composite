import os
import logging
import asyncio
from dotenv import load_dotenv
from signal import SIGINT, SIGTERM
from livekit import rtc
import pyaudio
import numpy as np
from auth import generate_token

load_dotenv()
# ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in your .env file
LIVEKIT_URL = os.environ.get("LIVEKIT_URL")
ROOM_NAME = os.environ.get("ROOM_NAME")

# default audio settings
SAMPLE_RATE = 48000
NUM_CHANNELS = 1
CHUNK_SIZE = 480  # 10ms at 48kHz

async def main(room: rtc.Room):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Create the audio source before using it in the callback
    source = rtc.AudioSource(SAMPLE_RATE, NUM_CHANNELS)
    
    # Flag to control when to stop capturing
    running = True

    # init audio stream in blocking mode
    audio = pyaudio.PyAudio()
    audio_stream = audio.open(
        format=pyaudio.paInt16,
        channels=NUM_CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=CHUNK_SIZE,
        # No callback = blocking mode
    )

    # Task to handle audio capture in a background task
    async def capture_audio():
        try:
            while running:
                # Read audio data in blocking mode
                try:
                    in_data = audio_stream.read(CHUNK_SIZE, exception_on_overflow=False)
                except Exception as e:
                    logger.warning(f"Error reading audio: {e}")
                    await asyncio.sleep(0.01)  # Wait a bit before retrying
                    continue
                
                # Process the audio data
                input_array = np.frombuffer(in_data, dtype=np.int16)
                
                # Create an audio frame
                audio_frame = rtc.AudioFrame.create(SAMPLE_RATE, NUM_CHANNELS, CHUNK_SIZE)
                
                # Convert the audio frame to a numpy array
                audio_data = np.frombuffer(audio_frame.data, dtype=np.int16)
                
                # Copy only as many samples as we have in the input or can fit in the output
                sample_count = min(len(input_array), len(audio_data))
                np.copyto(audio_data[:sample_count], input_array[:sample_count])
                
                # Capture the frame
                await source.capture_frame(audio_frame)
                
                # Small sleep to not overwhelm CPU
                await asyncio.sleep(0.001)
        except Exception as e:
            logger.error(f"Error in audio capture: {e}")
        finally:
            logger.info("Audio capture stopped")

    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info("participant connected: %s %s", participant.sid, participant.identity)

    # By default, autosubscribe is enabled. The participant will be subscribed to
    # all published tracks in the room

    # generate LiveKit token
    token = generate_token(ROOM_NAME, "audio-publisher", "Audio Publisher")

    await room.connect(LIVEKIT_URL, token)
    logger.info("connected to room %s", room.name)
    
    # publish a track
    track = rtc.LocalAudioTrack.create_audio_track("mic", source)
    options = rtc.TrackPublishOptions()
    options.source = rtc.TrackSource.SOURCE_MICROPHONE
    publication = await room.local_participant.publish_track(track, options)
    logging.info("published track %s", publication.sid)
    
    # Start the audio capture task
    audio_capture_task = asyncio.create_task(capture_audio())
    
    # Keep the main task running
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        running = False
        audio_capture_task.cancel()
        audio_stream.stop_stream()
        audio_stream.close()
        audio.terminate()
        await room.disconnect()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        handlers=[
            logging.FileHandler("send_audio.log"),
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
