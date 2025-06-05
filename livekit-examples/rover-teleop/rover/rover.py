#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "livekit",
#   "livekit_api",
#   "pyserial",
#   "python-dotenv",
#   "asyncio",
# ]
# ///

import os
import logging
import asyncio
import json
import serial
from dotenv import load_dotenv
from signal import SIGINT, SIGTERM
from livekit import rtc
from auth import generate_token

load_dotenv()
# ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in your .env file
LIVEKIT_URL = os.environ.get("LIVEKIT_URL")
ROOM_NAME = os.environ.get("ROOM_NAME")
ROVER_PORT = os.environ.get("ROVER_PORT")

async def read_serial_data(ser: serial.Serial, logger: logging.Logger, room: rtc.Room = None):
    """Read and parse data from serial port."""
    if not ser or not ser.is_open:
        return
    
    try:
        if ser.in_waiting:
            line = ser.readline().decode('utf-8').strip()
            try:
                data = json.loads(line)
                # Check if this is IMU data (type 1002)
                if data.get('T') == 1002:
                    # Parse IMU data
                    imu_data = {
                        'type': 'imu',
                        'data': {
                            'orientation': {
                                'roll': data.get('r', 0),    # Roll in degrees
                                'pitch': data.get('p', 0),   # Pitch in degrees
                                'yaw': data.get('y', 0)      # Yaw in degrees
                            },
                            'accel': {
                                'x': data.get('ax', 0),      # Accelerometer X in mg
                                'y': data.get('ay', 0),      # Accelerometer Y in mg
                                'z': data.get('az', 0)       # Accelerometer Z in mg
                            },
                            'gyro': {
                                'x': data.get('gx', 0),      # Gyroscope X in degrees/s
                                'y': data.get('gy', 0),      # Gyroscope Y in degrees/s
                                'z': data.get('gz', 0)       # Gyroscope Z in degrees/s
                            },
                            'mag': {
                                'x': data.get('mx', 0),      # Magnetometer X in uT
                                'y': data.get('my', 0),      # Magnetometer Y in uT
                                'z': data.get('mz', 0)       # Magnetometer Z in uT
                            },
                            'temp': data.get('temp', 0)      # Temperature in Celsius
                        }
                    }
                    logger.info(f"Parsed IMU data: {imu_data}")
                    
                    # Publish IMU data to room if available
                    if room and room.isconnected:
                        try:
                            await room.local_participant.publish_data(
                                json.dumps(imu_data).encode(),
                                topic="imu",
                                reliable=False
                            )
                        except Exception as e:
                            logger.error(f"Failed to publish IMU data: {e}")
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON from serial: {line}")
    except Exception as e:
        logger.error(f"Error reading serial data: {e}")

async def send_imu_query(ser: serial.Serial, logger: logging.Logger):
    """Send IMU query command to serial port."""
    if not ser or not ser.is_open:
        return
    
    try:
        command = {"T": 126}
        command_json = json.dumps(command) + "\n"
        ser.write(command_json.encode())
    except Exception as e:
        logger.error(f"Error sending IMU query: {e}")

async def main(room: rtc.Room):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Try to connect to serial port, but continue even if failed
    ser = None
    try:
        # Use the environment variable for port or default to a common port
        if not ROVER_PORT:
            logger.info("ROVER_PORT environment variable not set, defaulting to /dev/ttyUSB0")
            port = '/dev/ttyUSB0'
        else:
            port = ROVER_PORT
            
        # Create serial connection with 115200 baud rate using standard serial library
        ser = serial.Serial(port, 115200, timeout=1)
        logger.info(f"Successfully connected to serial port {port} at 115200 baud")
    except Exception as e:
        logger.warning(f"Failed to connect to serial port: {e}")
        logger.info("Continuing without serial connection - will only log received data")
        ser = None

    # Start periodic IMU query task
    async def periodic_imu_query():
        while True:
            await send_imu_query(ser, logger)
            await asyncio.sleep(0.1)  # 10Hz = 0.1 seconds

    # Start periodic serial data reading task
    async def periodic_serial_read():
        while True:
            await read_serial_data(ser, logger, room)
            await asyncio.sleep(0.01)  # Read at 100Hz to ensure we don't miss data

    # Start the periodic tasks if we have a serial connection
    if ser and ser.is_open:
        asyncio.create_task(periodic_imu_query())
        asyncio.create_task(periodic_serial_read())

    # handler for receiving data packet
    @room.on("data_received")
    def on_data_received(data: rtc.DataPacket):
        logger.info("Received data from %s topic: %s", data.participant.identity, data.topic)
        try:
            # Decode and parse the data
            decoded_data = data.data.decode('utf-8')
            
            # Try to parse as JSON
            json_data = json.loads(decoded_data)
            
            # First validate that data is of type 'gamepad'
            if not json_data.get('type') == 'gamepad':
                logger.info("Received data is not of type 'gamepad', ignoring")
                return
                
            # Get the gamepad data
            gamepad_data = json_data.get('data', {})
            
            # Check if we have the expected thumbstick values
            if all(k in gamepad_data for k in ["left_x", "left_y", "right_x", "right_y"]):
                # Get the throttle (left_y) and steering (right_x) values
                # Gamepad values are typically in range [-1, 1]
                throttle = float(gamepad_data['left_y'])
                steering = float(gamepad_data['right_x'])
                
                # Scale throttle to [-0.5, 0.5] range
                throttle_scaled = round(throttle * 0.5, 3)
                
                # Apply Gord_W's formula: y = a * x^3 + (1-a) * x
                # Using a = 0.5 for a good balance between linear and cubic response
                a = 0.5
                steering_curved = a * (steering ** 3) + (1 - a) * steering
                
                # Calculate base steering effect (opposing motor commands)
                steering_effect = steering_curved * 0.3  # Scale steering effect
                
                # Invert steering when in reverse
                if throttle_scaled < 0:
                    steering_effect = -steering_effect
                
                # Mix throttle and steering
                left_motor = throttle_scaled + steering_effect
                right_motor = throttle_scaled - steering_effect
                
                # Ensure values stay within the valid range [-0.5, 0.5]
                left_motor = max(min(left_motor, 0.5), -0.5)
                right_motor = max(min(right_motor, 0.5), -0.5)
                
                # Round to 3 decimal places
                left_motor = round(left_motor, 3)
                right_motor = round(right_motor, 3)
                
                # Create command JSON as specified
                command_data = {
                    "T": 1,  # Type 1 for motor control
                    "L": left_motor,
                    "R": right_motor
                }
                print(f"command_data: {command_data}")
                # Convert to JSON string
                command_json = json.dumps(command_data)
                
                # Forward to serial port if connection is available
                if ser and ser.is_open:
                    # Add newline for serial transmission
                    serial_command = command_json + "\n"
                    ser.write(serial_command.encode())
                    logger.info(f"Successfully sent to serial port: {command_json}")
                else:
                    logger.info("Serial connection not available - data logged but not sent")
            else:
                logger.info("Received data does not contain expected thumbstick values")
                
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            logger.error(f"Error decoding/parsing data: {e}")
        except Exception as e:
            logger.error(f"Error processing data: {e}")

    token = generate_token(ROOM_NAME, "rover", "Rover Receiver")
    await room.connect(LIVEKIT_URL, token, rtc.RoomOptions(auto_subscribe=False))
    logger.info("Connected to room %s", room.name)

    if not ser:
        logger.warning("Running without serial connection - will only log received gamepad data")
    else:
        logger.info("Ready to forward gamepad controls to serial port")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        handlers=[
            logging.FileHandler("rover.log"),
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

