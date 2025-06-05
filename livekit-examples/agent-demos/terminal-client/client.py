import asyncio
import logging
import os
from dotenv import load_dotenv
from livekit import rtc, api
import sounddevice as sd
import numpy as np
import signal
import queue
from typing import Dict

# Load environment variables
load_dotenv()

# Configuration
SAMPLE_RATE = 48000  # LiveKit's preferred sample rate
NUM_CHANNELS = 1     # Mono audio
FRAME_SIZE = 480     # Number of samples per frame

async def main():
    # Initialize logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s:%(message)s',
        handlers=[logging.StreamHandler()]
    )

    # Retrieve environment variables
    URL = os.getenv("LIVEKIT_URL")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

    if not all([URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
        logging.error("Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your .env file.")
        return

    # Prompt for room name
    room_name = input("Enter the room name you want to join: ").strip()
    if not room_name:
        logging.error("Room name cannot be empty")
        return

    # Create a LiveKit Room instance
    room = rtc.Room()

    # Generate access token with the provided room name
    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity("python-voice-app")
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
            )
        )
        .to_jwt()
    )

    # Dictionary to track audio tasks by track SID
    audio_tasks: Dict[str, asyncio.Task] = {}

    # List to keep track of all background tasks
    background_tasks = set()

    # Event handler for participant connections
    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        logging.info(f"Participant connected: {participant.sid} {participant.identity}")
        for publication in participant.track_publications.values():
            if publication.track and publication.track.kind == rtc.TrackKind.KIND_AUDIO:
                asyncio.create_task(participant.subscribe(publication.track))

    # Event handler for participant disconnections
    @room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.Participant):
        logging.info(f"Participant disconnected: {participant.sid} {participant.identity}")
        # Clean up any audio tasks for this participant's tracks
        for publication in participant.track_publications.values():
            if publication.sid in audio_tasks:
                task = audio_tasks.pop(publication.sid)
                task.cancel()

    # Event handler for track subscriptions
    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        asyncio.create_task(handle_track_subscribed(track, publication, participant))

    # Event handler for track unsubscriptions
    @room.on("track_unsubscribed")
    def on_track_unsubscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        logging.info(f"Track unsubscribed: {publication.sid} from {participant.identity}")
        if publication.sid in audio_tasks:
            task = audio_tasks.pop(publication.sid)
            task.cancel()

    async def handle_track_subscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        logging.info(f"Track subscribed: {publication.sid} from {participant.identity}")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            audio_stream = rtc.AudioStream(track)
            task = asyncio.create_task(play_audio(audio_stream))
            audio_tasks[publication.sid] = task
            background_tasks.add(task)
            task.add_done_callback(background_tasks.discard)

    # Connect to the LiveKit room
    try:
        await room.connect(URL, token, options=rtc.RoomOptions(auto_subscribe=True))
        logging.info(f"Connected to room: {room.name}")
    except Exception as e:
        logging.error(f"Failed to connect to room: {e}")
        return

    # Create an audio source and local audio track
    audio_source = rtc.AudioSource(SAMPLE_RATE, NUM_CHANNELS)
    local_audio_track = rtc.LocalAudioTrack.create_audio_track("microphone", audio_source)

    # Publish the local audio track to the room
    publish_options = rtc.TrackPublishOptions()
    publish_options.source = rtc.TrackSource.SOURCE_MICROPHONE

    try:
        publication = await room.local_participant.publish_track(local_audio_track, publish_options)
        logging.info(f"Published audio track: {publication.sid}")
    except Exception as e:
        logging.error(f"Failed to publish audio track: {e}")
        await room.disconnect()
        return

    # Start capturing and sending audio frames
    capture_task = asyncio.create_task(capture_and_publish_audio(audio_source))
    background_tasks.add(capture_task)
    capture_task.add_done_callback(background_tasks.discard)

    # Setup shutdown event
    shutdown_event = asyncio.Event()

    # Define signal handler
    def _signal_handler():
        logging.info("Shutdown signal received.")
        shutdown_event.set()

    # Register signal handlers
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            # Warning for Windows users, since signal handlers aren't supported
            logging.warning(f"Signal {sig} not implemented on this platform.")

    # Wait for shutdown signal
    await shutdown_event.wait()
    logging.info("Initiating shutdown...")

    # Disconnect from the room to stop receiving new tracks
    try:
        await room.disconnect()
        logging.info("Disconnected from room.")
    except Exception as e:
        logging.error(f"Error during room disconnect: {e}")

    # Cancel all background tasks
    for task in list(background_tasks):
        task.cancel()
    if background_tasks:
        logging.info(f"Cancelling {len(background_tasks)} background tasks...")
        await asyncio.gather(*background_tasks, return_exceptions=True)
        logging.info("All background tasks cancelled.")

async def capture_and_publish_audio(source: rtc.AudioSource):
    """
    Captures audio from the microphone and publishes it.
    """
    loop = asyncio.get_running_loop()

    def callback(indata, frames, time_info, status):
        if status:
            logging.warning(f"Audio input status: {status}")
        # Convert the audio data to int16 format
        audio_data = (indata * 32767).astype(np.int16).tobytes()
        samples_per_channel = frames
        # Create an AudioFrame with the audio data
        frame = rtc.AudioFrame(
            data=audio_data,
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
            samples_per_channel=samples_per_channel,
        )
        # Send the frame to LiveKit
        asyncio.run_coroutine_threadsafe(
            source.capture_frame(frame), loop
        )

    # Open the input stream
    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=NUM_CHANNELS,
        dtype='float32',
        callback=callback,
    ):
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logging.info("Stopping audio capture.")
            # If the microphone stops working, raise an exception since everything is probably exploding
            raise

async def play_audio(audio_stream: rtc.AudioStream):
    """
    Plays audio received from other participants.
    """
    audio_queue = queue.Queue(maxsize=100)  # Queue for thread-safe audio frames

    async def read_audio_frames():
        try:
            async for event in audio_stream:
                if event is None:
                    logging.info("Audio stream has ended.")
                    break
                audio_queue.put(event.frame)
                logging.debug("Received audio frame.")
        except Exception as e:
            logging.error(f"Error reading audio stream: {e}")

    # Start reading frames
    reader_task = asyncio.create_task(read_audio_frames())

    def callback(outdata, frames, time_info, status):
        if status:
            logging.warning(f"Audio output status: {status}")
        try:
            # Get the frame from the queue
            frame = audio_queue.get_nowait()
            # Convert the frame data to float32 and normalize
            data = np.frombuffer(frame.data, dtype=np.int16).astype(np.float32) / 32768
            # Ensure the data has the correct shape
            data = data.reshape(-1, NUM_CHANNELS)
            outdata[:] = data
            logging.debug(f"Playing frame with {len(data)} samples.")
        except queue.Empty:
            # No data available, output silence
            outdata.fill(0)
            logging.debug("No audio frame available, outputting silence.")
        except ValueError as ve:
            logging.error(f"Error in audio playback callback: {ve}")
            outdata.fill(0)
        except Exception as e:
            logging.error(f"Unexpected error in callback: {e}")
            outdata.fill(0)

    with sd.OutputStream(
        samplerate=SAMPLE_RATE,
        channels=NUM_CHANNELS,
        dtype='float32',
        callback=callback,
        blocksize=FRAME_SIZE
    ):
        logging.info("Started playing audio from remote participants.")
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logging.info("Stopping audio playback.")
            reader_task.cancel()
            raise

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Application interrupted by user. Exiting...")
    except Exception as e:
        logging.error(f"Unexpected error: {e}")