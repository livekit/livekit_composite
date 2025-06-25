#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "livekit",
#   "livekit_api",
#   "python-dotenv",
#   "asyncio",
#   "statistics",
#   "cbor2",
# ]
# ///

import os
import logging
import asyncio
import json
import time
import statistics
from collections import deque
from dotenv import load_dotenv
from signal import SIGINT, SIGTERM
from livekit import rtc
from auth import generate_token
from data import deserialize

load_dotenv()
# ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in your .env file
LIVEKIT_URL = os.environ.get("LIVEKIT_URL")
ROOM_NAME = os.environ.get("ROOM_NAME")

class MessageStats:
    def __init__(self, window_size=10000):
        self.window_size = window_size
        self.latencies = deque(maxlen=window_size)
        self.intervals = deque(maxlen=window_size)
        self.message_sizes = deque(maxlen=window_size)
        self.last_receive_time = None
        self.last_sequence = None
        self.messages_received = 0
        self.messages_dropped = 0
        self.start_time = time.time()

    def add_message(self, sequence: int, timestamp: int, size: int):
        current_time = time.time_ns()
        latency = (current_time - timestamp) / 1_000_000  # Convert to milliseconds
        
        self.latencies.append(latency)
        self.message_sizes.append(size)
        
        if self.last_receive_time is not None:
            interval = (current_time - self.last_receive_time) / 1_000_000  # Convert to milliseconds
            self.intervals.append(interval)
        
        if self.last_sequence is not None:
            expected_sequence = (self.last_sequence + 1) % 1000000  # Handle sequence wrap-around
            if sequence != expected_sequence:
                self.messages_dropped += (sequence - expected_sequence) % 1000000
        
        self.last_receive_time = current_time
        self.last_sequence = sequence
        self.messages_received += 1

    def get_stats(self):
        if not self.latencies:
            return "No messages received yet"
        
        elapsed_time = time.time() - self.start_time
        messages_per_second = self.messages_received / elapsed_time
        
        stats = {
            "messages_received": self.messages_received,
            "messages_dropped": self.messages_dropped,
            "messages_per_second": round(messages_per_second, 2),
            "latency_ms": {
                "min": round(min(self.latencies), 2),
                "max": round(max(self.latencies), 2),
                "mean": round(statistics.mean(self.latencies), 2),
                "median": round(statistics.median(self.latencies), 2),
                "p95": round(statistics.quantiles(self.latencies, n=20)[18], 2),  # 95th percentile
            },
            "message_size_bytes": {
                "min": min(self.message_sizes),
                "max": max(self.message_sizes),
                "mean": round(statistics.mean(self.message_sizes), 2),
                "median": round(statistics.median(self.message_sizes), 2),
            }
        }
        
        if len(self.intervals) > 1:
            stats["jitter_ms"] = round(statistics.stdev(self.intervals), 2)
        
        return stats

async def main(room: rtc.Room):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    stats = MessageStats()
    last_stats_time = time.time()

    @room.on("participant_joined")
    def on_participant_joined(participant: rtc.Participant):
        logger.info("Participant %s joined the room", participant.identity)

    @room.on("data_received")
    def on_data_received(data: rtc.DataPacket):
        nonlocal last_stats_time
        try:
            # Decode and parse the data using CBOR
            json_data = deserialize(data.data)
            
            # Verify this is robot control data
            if json_data.get('type') != 'telemetry':
                return
            
            # Update statistics
            stats.add_message(
                sequence=json_data['sequence'],
                timestamp=json_data['timestamp'],
                size=len(data.data)
            )
            
            # Log statistics every second
            current_time = time.time()
            if current_time - last_stats_time >= 1.0:
                logger.info(f"Statistics: {json.dumps(stats.get_stats(), indent=2)}")
                last_stats_time = current_time
                
        except Exception as e:
            logger.error(f"Error processing received data: {e}")

    token = generate_token(ROOM_NAME, "subscriber", "Telemetry Subscriber")
    await room.connect(LIVEKIT_URL, token, rtc.RoomOptions(auto_subscribe=True))
    logger.info("Connected to room %s", room.name)

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        handlers=[
            logging.FileHandler("subscriber.log"),
            logging.StreamHandler(),
        ],
    )

    loop = asyncio.get_event_loop()
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