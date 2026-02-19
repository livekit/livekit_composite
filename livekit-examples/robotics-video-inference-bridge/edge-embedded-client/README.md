# Edge Embedded Client

ESP32-IDF application that streams H.264 video from an ESP32-P4 camera to the cloud processor via [LiveKit](https://livekit.io/). Receives bounding box detections in real-time and logs them to serial output.

## Features

- H.264 hardware encoding on ESP32-P4
- 640x480 @ 15fps video streaming
- MIPI CSI camera support
- WiFi or Ethernet connectivity
- Receives detections on `bounding_boxes` topic

## Requirements

- ESP-IDF v5.4+
- ESP32-P4 development board (e.g., ESP32-P4-NANO)
- MIPI CSI camera module

## Compatibility

This client has been tested on:

- [Waveshare ESP32-P4-Nano](https://www.waveshare.com/esp32-p4-nano.htm).

## Configuration

> [!TIP]
> Options can either be set through _menuconfig_ or added to _sdkconfig_.

### Credentials

**Option A**: Use a LiveKit Sandbox:

```ini
CONFIG_LK_EXAMPLE_USE_SANDBOX=y
CONFIG_LK_EXAMPLE_SANDBOX_ID="my-project-xxxxxx"
CONFIG_LK_EXAMPLE_ROOM_NAME="edge-cv"
CONFIG_LK_EXAMPLE_PARTICIPANT_NAME="edge-embedded-client"
```

**Option B**: Use a pre-generated token:

```ini
CONFIG_LK_EXAMPLE_USE_PREGENERATED=y
CONFIG_LK_EXAMPLE_SERVER_URL="wss://your-project.livekit.cloud"
CONFIG_LK_EXAMPLE_TOKEN="<your token>"
```

### Network

Connect using WiFi:

```ini
CONFIG_LK_EXAMPLE_USE_WIFI=y
CONFIG_LK_EXAMPLE_WIFI_SSID="<your SSID>"
CONFIG_LK_EXAMPLE_WIFI_PASSWORD="<your password>"
```

Or using Ethernet:

```ini
CONFIG_LK_EXAMPLE_USE_ETHERNET=y
```

### Video Settings

```ini
CONFIG_LK_EXAMPLE_VIDEO_WIDTH=640
CONFIG_LK_EXAMPLE_VIDEO_HEIGHT=480
CONFIG_LK_EXAMPLE_VIDEO_FPS=15
```

### Development Board

```ini
CONFIG_LK_EXAMPLE_CODEC_BOARD_TYPE="ESP32_P4_NANO"
```

## Build & Flash

```sh
cd edge-embedded-client
idf.py menuconfig  # Configure settings
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

## Output

Once running, the device connects to WiFi and joins the LiveKit room:

```
I (5000) wifi: Connected: IP=192.168.1.100
I (6000) livekit_example: Room state changed: Connected
```

When the cloud processor detects objects:

```
I (10000) livekit_example: Detected 2 object(s):
I (10000) livekit_example:   [0] person conf=0.95 x1=0.100 y1=0.200 x2=0.500 y2=0.800
I (10000) livekit_example:   [1] dog conf=0.87 x1=0.600 y1=0.150 x2=0.900 y2=0.850
```

## Generate Token

```sh
lk token create --join --room edge-cv --identity edge-embedded-client --valid-for 168h
```

Use longer validity (168h = 7 days) for embedded devices.

## Known Errors

If you have trouble flashing your device with a MacOS device, check if you use [wch driver](https://github.com/WCHSoftGroup/ch34xser_macos.git).
If you have trouble seeing the output of device, check your console method in sdkconfig

```bash
CONFIG_ESP_CONSOLE_UART_DEFAULT=y
```
