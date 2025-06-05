# Peer Demo

## Overview

This demo demonstrates how to use the `esp_peer` API to build a simple chat application on ESP32 series boards.  
The application sends fake audio data and chat strings over data channel at regular intervals after establishing a connection.

## Hardware Requirements

This demo requires minimal hardware: any board that supports Wi-Fi connectivity is sufficient.
It needs 2 boards to act as chat peers.

## How to Build

### IDF Version

You can use either the IDF master branch or the IDF release v5.4.

### Dependencies

This demo only depends on the **ESP-IDF**. All other required modules will be automatically downloaded from the [ESP-IDF Component Registry](https://components.espressif.com/).

### Change Default Settings

Update the Wi-Fi SSID and password in the [settings.h](main/settings.h) file.

### Build and Flash

Run the following command to build, flash for the demo:
```bash
idf.py -p YOUR_SERIAL_DEVICE flash monitor
```

## Testing

After the board boots up, it will attempt to connect to the configured Wi-Fi network.
Once the Wi-Fi connection is established successfully, you can use the following console commands to test the demo:

1. `start <roomid>`: Enter the specified room and start the chat.
2. `stop`: Stop the chat.
3. `i`: Display system loading information.
4. `wifi <ssid> <password>`: Connect to a new Wi-Fi SSID with a password.

## Technical Details

  This demo uses the `apprtc` signaling implementation (`esp_signaling_get_apprtc_signaling`) as the default signaling.  
  The signaling flow follows the [Connection Build Flow](../../components/esp_webrtc/README.md#typical-call-sequence-of-esp_webrtc).  
  It provides a detailed demonstration of how to use the `esp_peer` protocol API to set up a WebRTC application.
