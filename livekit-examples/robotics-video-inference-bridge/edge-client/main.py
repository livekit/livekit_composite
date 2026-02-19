import asyncio
import json
import logging
import os

import imageio.v3 as iio
from dotenv import load_dotenv
from livekit import api, rtc

load_dotenv(".env.local")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("edge-client")

WIDTH, HEIGHT = 640, 480


async def capture_frames(source: rtc.VideoSource):
    """Capture webcam frames and publish."""
    cam = iio.imiter("<video0>", size=(WIDTH, HEIGHT))
    logger.info("Webcam streaming...")
    try:
        for frame in cam:
            video_frame = rtc.VideoFrame(WIDTH, HEIGHT, rtc.VideoBufferType.RGB24, frame.tobytes())
            source.capture_frame(video_frame)
            await asyncio.sleep(0)  # yield to event loop
    finally:
        cam.close()


async def main():
    url = os.environ["LIVEKIT_URL"]
    api_key = os.environ["LIVEKIT_API_KEY"]
    api_secret = os.environ["LIVEKIT_API_SECRET"]
    room_name = os.environ.get("LIVEKIT_ROOM", "edge-cv")

    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity("edge-client")
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )

    room = rtc.Room()

    @room.on("data_received")
    def on_data_received(data: rtc.DataPacket):
        if data.topic == "bounding_boxes":
            payload = json.loads(data.data.decode())
            boxes = payload.get("boxes", [])
            if boxes:
                print(f"Detected {len(boxes)} object(s):")
                for i, box in enumerate(boxes):
                    print(f"  [{i}] {box['class']} conf={box['confidence']:.2f} x1={box['x1']:.3f} y1={box['y1']:.3f} x2={box['x2']:.3f} y2={box['y2']:.3f}")

    logger.info(f"Connecting to room: {room_name}")
    await room.connect(url, token)
    logger.info("Connected, publishing video...")

    source = rtc.VideoSource(WIDTH, HEIGHT)
    track = rtc.LocalVideoTrack.create_video_track("webcam", source)
    await room.local_participant.publish_track(track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_CAMERA))

    try:
        await capture_frames(source)
    except asyncio.CancelledError:
        pass
    finally:
        await room.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
