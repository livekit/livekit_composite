import time
import cbor2
from typing import Dict, Any, Union


async def generate_telemetry(sequence: int) -> Dict[str, Any]:
    """Generate dummy robot control data."""
    return {
        "type": "telemetry",
        "sequence": sequence,
        "timestamp": time.time_ns(),
        "data": {
            "motors": {
                "left": {
                    "speed": 0.5 * (sequence % 100) / 100,  # Oscillating between 0 and 0.5
                    "current": 2.5 + (sequence % 10) / 10,  # 2.5-3.5 amps
                    "temperature": 35 + (sequence % 5),     # 35-40°C
                    "status": "normal"
                },
                "right": {
                    "speed": 0.5 * ((sequence + 50) % 100) / 100,  # Phase shifted
                    "current": 2.5 + ((sequence + 5) % 10) / 10,   # 2.5-3.5 amps
                    "temperature": 35 + ((sequence + 2) % 5),      # 35-40°C
                    "status": "normal"
                }
            },
            "steering": {
                "angle": 0.5 * ((sequence + 25) % 100) / 100,  # Different phase
                "force": 1.5 + (sequence % 20) / 20,           # 1.5-2.5 Nm
                "temperature": 30 + (sequence % 3),            # 30-33°C
                "status": "normal"
            },
            "sensors": {
                "imu": {
                    "acceleration": {
                        "x": 0.1 * (sequence % 100) / 100,
                        "y": 0.1 * ((sequence + 33) % 100) / 100,
                        "z": 9.81 + 0.1 * ((sequence + 66) % 100) / 100
                    },
                    "gyro": {
                        "x": 0.1 * (sequence % 100) / 100,
                        "y": 0.1 * ((sequence + 33) % 100) / 100,
                        "z": 0.1 * ((sequence + 66) % 100) / 100
                    }
                },
                "gps": {
                    "latitude": 37.7749 + (sequence % 100) / 10000,
                    "longitude": -122.4194 + (sequence % 100) / 10000,
                    "altitude": 10.0 + (sequence % 50) / 10,
                    "speed": 0.5 + (sequence % 20) / 10,
                    "heading": sequence % 360
                }
            }
        }
    }


def serialize(telemetry_data: Dict[str, Any]) -> bytes:
    """Serialize telemetry data using CBOR for over-the-wire transmission.
    
    Args:
        telemetry_data: Dictionary containing telemetry data
        
    Returns:
        bytes: CBOR-encoded telemetry data
    """
    return cbor2.dumps(telemetry_data)


def deserialize(encoded_data: bytes) -> Dict[str, Any]:
    """Deserialize CBOR-encoded telemetry data.
    
    Args:
        encoded_data: CBOR-encoded bytes
        
    Returns:
        Dict[str, Any]: Decoded telemetry data
    """
    return cbor2.loads(encoded_data) 