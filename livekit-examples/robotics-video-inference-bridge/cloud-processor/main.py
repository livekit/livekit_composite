import asyncio
import json
import logging
import os
import time

import numpy as np
from dotenv import load_dotenv
from livekit import api, rtc
from ultralytics import YOLO

load_dotenv(".env.local")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cloud-processor")

TARGET_FPS = 10
FRAME_INTERVAL = 1.0 / TARGET_FPS


async def process_video_track(track: rtc.Track, model: YOLO, room: rtc.Room):
    """Process video frames from a track."""
    video_stream = rtc.VideoStream(track)
    last_frame_time = 0.0

    async for frame_event in video_stream:
        now = time.monotonic()
        if now - last_frame_time < FRAME_INTERVAL:
            continue
        last_frame_time = now

        frame = frame_event.frame
        rgb_frame = frame.convert(rtc.VideoBufferType.RGB24)
        arr = np.frombuffer(rgb_frame.data, dtype=np.uint8).reshape(
            (rgb_frame.height, rgb_frame.width, 3)
        )

        results = await asyncio.to_thread(model, arr, conf=0.5, imgsz=640, verbose=False)

        boxes = []
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            class_id = int(box.cls)
            boxes.append({
                "class": model.names[class_id],
                "confidence": float(box.conf.item()),
                "x1": x1 / rgb_frame.width,
                "y1": y1 / rgb_frame.height,
                "x2": x2 / rgb_frame.width,
                "y2": y2 / rgb_frame.height,
            })

        if boxes:
            logger.info(f"Detected {len(boxes)} object(s)")

        await room.local_participant.publish_data(
            payload=json.dumps({
                "timestamp": time.time(),
                "frame_width": rgb_frame.width,
                "frame_height": rgb_frame.height,
                "boxes": boxes,
            }).encode(),
            reliable=False,
            topic="bounding_boxes",
        )


async def main():
    url = os.environ["LIVEKIT_URL"]
    api_key = os.environ["LIVEKIT_API_KEY"]
    api_secret = os.environ["LIVEKIT_API_SECRET"]
    room_name = os.environ.get("LIVEKIT_ROOM", "edge-cv")

    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity("cloud-processor")
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )

    logger.info("Loading YOLO model...")
    model = YOLO("yolo11n.pt")
    model(np.zeros((640, 640, 3), dtype=np.uint8), verbose=False)  # Warmup
    logger.info("Model ready")

    room = rtc.Room()
    video_task = None

    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication, participant):
        nonlocal video_task
        if track.kind == rtc.TrackKind.KIND_VIDEO and video_task is None:
            logger.info(f"Video track subscribed from {participant.identity}")
            video_task = asyncio.create_task(process_video_track(track, model, room))

    logger.info(f"Connecting to {url}")
    await room.connect(url, token)
    logger.info("Connected, waiting for video stream...")

    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        pass
    finally:
        logger.info("Disconnecting...")
        await room.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
