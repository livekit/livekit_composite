#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "livekit",
#   "livekit_api",
#   "python-dotenv",
#   "asyncio",
#   "cbor2",
# ]
# ///

import os
import logging
import asyncio
import time
from dotenv import load_dotenv
from signal import SIGINT, SIGTERM
from livekit import rtc
from auth import generate_token
from data import generate_telemetry, serialize

load_dotenv()
# ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in your .env file
LIVEKIT_URL = os.environ.get("LIVEKIT_URL")
ROOM_NAME = os.environ.get("ROOM_NAME")

async def main(room: rtc.Room):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    sequence = 0
    last_publish_time = time.time()
    messages_sent = 0
    last_loop_end = time.time_ns()
    
    @room.on("participant_joined")
    def on_participant_joined(participant: rtc.Participant):
        logger.info("Participant %s joined the room", participant.identity)

    async def publish_control_data():
        nonlocal sequence, last_publish_time, messages_sent, last_loop_end
        while True:
            try:
                loop_start = time.time_ns()
                loop_interval = (loop_start - last_loop_end) / 1_000_000  # Convert to milliseconds
                
                # Generate data
                gen_start = time.time_ns()
                control_data = await generate_telemetry(sequence)
                gen_time = time.time_ns() - gen_start
                
                # Publish to room
                pub_start = time.time_ns()
                payload = serialize(control_data)
                payload_size = len(payload)
                await room.local_participant.publish_data(
                    payload,
                    topic="telemetry",
                    reliable=False
                )
                pub_time = time.time_ns() - pub_start
                
                # Update statistics
                messages_sent += 1
                current_time = time.time()
                if current_time - last_publish_time >= 1.0:  # Log stats every second
                    total_time = time.time_ns() - loop_start
                    logger.info(
                        f"Publishing at {messages_sent} messages/second\n"
                        f"Timing (microseconds):\n"
                        f"  Loop interval: {loop_interval:.2f}\n"
                        f"  Generation: {gen_time/1000:.2f}\n"
                        f"  Publishing: {pub_time/1000:.2f}\n"
                        f"  Total loop: {total_time/1000:.2f}\n"
                        f"Payload size: {payload_size} bytes"
                    )
                    messages_sent = 0
                    last_publish_time = current_time
                
                sequence += 1
                
                # Calculate sleep time to maintain 100Hz
                loop_time = (time.time_ns() - loop_start) / 1_000_000_000  # Convert to seconds
                sleep_time = max(0, 0.001 - loop_time - loop_interval)  # 1KHz = 0.001 seconds
                await asyncio.sleep(sleep_time)
                last_loop_end = time.time_ns()
                
            except Exception as e:
                logger.error(f"Error publishing data: {e}")
                await asyncio.sleep(1)  # Wait a bit before retrying

    token = generate_token(ROOM_NAME, "publisher", "TelemetryPublisher")
    await room.connect(LIVEKIT_URL, token, rtc.RoomOptions(auto_subscribe=False))
    logger.info("Connected to room %s", room.name)
    
    # Start publishing task
    asyncio.create_task(publish_control_data())

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        handlers=[
            logging.FileHandler("publisher.log"),
            logging.StreamHandler(),
        ],
    )

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    room = rtc.Room(loop=loop)

    async def cleanup():
        await room.disconnect()
        loop.stop()

    asyncio.ensure_future(main(room))
    for signal in [SIGINT, SIGTERM]:
        loop.add_signal_handler(signal, lambda: asyncio.ensure_future(cleanup()))

    try:
        loop.run_forever()
    finally:
        loop.close() 