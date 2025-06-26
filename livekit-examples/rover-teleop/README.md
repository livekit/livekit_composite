# Raspberry Pi Rover Teleoperations
![image](https://github.com/user-attachments/assets/cba39d62-a6be-4e29-939c-c5fb1ac55f4d)

This project demostrates building a high performance robot tele-op system using LiveKit that enables < *200ms* latency video and controls.  Everything needed to build the rover in this project was available off the shelf, costing no more than $200.  The repo includes the source code that runs on the rover for streaming realtime video and receiving control messages via LiveKit.  It also includes a Flutter app for remote teleop user for controlling the rover with a standard gamepad.

## Rover

The rover is built with all off-the-shelf components costing less than $200 USD.  This does not include the gamepad used by controller app.

1. [Raspberry Pi 4B 8GB](https://www.sparkfun.com/raspberry-pi-4-model-b-8-gb.html) - $75
2. [Raspberry Pi Camera V2](https://www.amazon.com/Raspberry-Pi-Camera-Module-Megapixel/dp/B01ER2SKFS) - $12
3. [Waveshare Rover](https://www.amazon.com/Waveshare-Flexible-Expandable-Chassis-Multiple/dp/B0CF55LM6Q) - $99
4. [3x 18650 batteries](https://www.amazon.com/dp/B0CDRBR2M1) - ~$14
4. Assorted mounting hardware & jumper cables

Total cost = $200

### LiveKit Account

You will need a API key for LiveKit cloud or host your own LiveKit server to run this demo.  Get a free account at [https://cloud.livekit.io](https://cloud.livekit.io).

### Rover Hardware Setup

1. Install batteries into rover.
2. Install the Raspberry Pi onto the mounting bracket.
3. Install the camera module onto the mounting bracket.
4. Install the camera/compute bracket onto the rover.
5. Connect 5V, ground, Uart TX/TX to the rover ESP32.

### Raspberry Pi OS Setup

Before setting up the rover teleop software, you need to prepare your Raspberry Pi.  

1. Install Raspberry Pi OS 64-bit (Bookworm):
   - Download the Raspberry Pi Imager from [raspberrypi.com/software](https://www.raspberrypi.com/software/).
   - Use the imager to install Raspberry Pi OS 64-bit (Bookworm) on your SD card.
   - Complete the initial setup process (create user, set timezone, connect to WiFi).
   - This repo assumes you are configuring the Pi to use the default user `pi`.

2. Enable required interfaces:
   Power up the Pi connected to a monitor, keyboard, and mouse to continue the setup.  It should boot directly into a GUI desktop environment.

   ```
   sudo raspi-config
   ```
   - Navigate to "Interface Options"
   - Enable SSH
   - Enable Serial port - but do not enable login shell on serial port.
   - Enable I2C
   - Enable SPI
   - Reboot when prompted or run `sudo reboot`

3. Disable booting into GUI interface
   ```
   sudo systemctl set-default multi-user.target
   ```

3. Set up the Raspberry Pi Camera v2:
   - Connect the camera module to the Raspberry Pi's camera port
   - Add the following to `/boot/firmware/config.txt`:
   ```
   sudo nano /boot/firmware/config.txt
   ```
   - Comment out the line that says:
   ```
   camera_auto_detect=1
   ```
   - Add the following line:
   ```
   dtoverlay=imx219,rotation=0
   ```
   - Save and reboot

4. Verify the camera is working:
   ```
   rpicam-hello
   ```
   - You should see the detected camera image displayed

At this point, you should be able to ssh into the pi and do everything remotely.

### Install Dependencies

Install other dependencies that the rover apps require:

1. Install uv (modern Python package manager):
   ```
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
2. Install other dependencies
   ```
   sudo apt install -y git
   ```
3. Install Gstreamer
   ```
   sudo apt install -y gstreamer1.0-libcamera gstreamer1.0-tools \
   gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
   gstreamer1.0-plugins-ugly   gstreamer1.0-libav   gstreamer1.0-alsa
   ```

4. Install the LiveKit CLI
   ```
   curl -sSL https://get.livekit.io/cli | bash
   ```

### Rover App Setup

1. Clone this repository to your Raspberry Pi:
   ```
   cd ~
   git clone https://github.com/livekit-examples/rover-teleop.git
   cd rover-teleop
   ```

4. Copy `env.example` to `.env` and fill with your actual credentials:
   ```
   cp /home/pi/rover-teleop/env.example /home/pi/rover-teleop/rover/.env
   nano /home/pi/rover-teleop/rover/.env
   ```

   Add your actual values for:
   ```
   LIVEKIT_URL=<your LiveKit server URL>
   LIVEKIT_API_KEY=<your API Key>
   LIVEKIT_API_SECRET=<your API Secret>
   LIVEKIT_CONTROLLER_TOKEN=<Token for the teleop controller app>
   ROOM_NAME=<your room name>
   ROVER_PORT=/dev/serial0
   ```

3. Run the installation script to create systemd services:
   ```
   sudo ./install-services.sh
   ```

   This script will:
   - Install the systemd service files
   - Enable the services to start at boot


### Service Management

Start services:
```
sudo systemctl start rover-cam-gstreamer.service
sudo systemctl start rover-cam-publish.service
sudo systemctl start rover-control.service
```

Check service status:
```
sudo systemctl status rover-cam-gstreamer.service
sudo systemctl status rover-cam-publish.service  
sudo systemctl status rover-control.service
```

Stop services:
```
sudo systemctl stop rover-cam-gstreamer.service
sudo systemctl stop rover-cam-publish.service
sudo systemctl stop rover-control.service
```

View logs:
```
sudo journalctl -u rover-cam-gstreamer.service
sudo journalctl -u rover-cam-publish.service
sudo journalctl -u rover-control.service
```

## Rover Teleop Controller

This Flutter application connects to a LiveKit server to control and view a rover's camera feed.

### Setup

1. Create a copy of your `.env` file in the `controller` directory:

```
cp /home/pi/rover-teleop/rover/.env /home/pi/rover-teleop/controller/.env
```

2. Change to the controller directory:

```
cd controller
```

3. Install dependencies:

```bash
flutter pub get
```

4. Run the application:

```bash
flutter run -d macos
```

### Usage
When the app is running, you will see the video from your rover.

![image](https://github.com/user-attachments/assets/928cb096-c130-49b2-80d9-0584f37b33b1)

The app will automatically connect to the LiveKit server using the credentials from the `.env` file.

- The main screen displays the rover camera feed when connected
- Tap the `Start/Stop` button on the top left to enable/disable tele-op.
- Tap the `Mute/Unmute` button on the top right to enable/disable streaming audio from local microphone. This is not used for anything currently.
- The left thumbstick Y axis controls the throttle on the rover, pushing forward on the stick will cause the rover to drive forward, pulling back will reverse.
- The right thumbstick X axis controls steering proportionally.

### Requirements

- Flutter 3.7.2 or higher
- A valid LiveKit server and token
- A connected gamepad.  It can usb or Bluetooth.  XBox or Playstation controllers work great.

### Notes
- This app has only been tested on MacOS, but it should work on iOS, Android, Windows without any issues.

## Performance

The roundtrip glass-to-glass latency can be measured by pointing the rover at a clock on the same screen displaying the rover video stream.  Rover and controller were both connected to LiveKit Cloud.  By taking a screenshot, we can calculate the latency is approximately 190ms.

![image](https://github.com/user-attachments/assets/7059c73b-da3a-4b8f-b467-13c104cb60b0)

## Notes
- To further reduce latency, we can add WIFI 6/7 capable radio to rover (-10ms) and move controller laptop to ethernet (-20-30ms).


