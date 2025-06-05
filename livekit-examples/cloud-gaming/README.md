## What is this
This is a docker container that runs headless Steam. Much of the steam-headless code is forked from https://github.com/Steam-Headless/docker-steam-headless
- Required programs are started/kept alive with supervisord.
- Inputs in the docker container come from the input-handler code which creates a virtual keyboard, mouse, and gamepad and connects to a livekit room datachannel to receive inputs and pass them on using uinput.
- Gstreamer is used along with the [livekitwebrtcsink](https://gstreamer.freedesktop.org/documentation/rswebrtc/livekitwebrtcsink.html?gi-language=c)
- the dockerfile downloads and compiles the livekitwebrtcsink plugin from [here](https://gitlab.freedesktop.org/gstreamer/gst-plugins-rs)
- support for hardware encoding currently requires this renegotiation to be commented out and the plugins recompiled [here](https://gitlab.freedesktop.org/gstreamer/gst-plugins-rs/-/blob/main/net/webrtc/src/webrtcsink/imp.rs?ref_type=heads#L3274-3286)
- Gstreamer is using h264 hardware encoding enabled by cuda/GPU drivers.

## How to run
 Requires a VM with an attached GPU and installed drivers.
- `docker run -e LK_ENDPOINT={lk-endpoint} -e ENV_LK_API_KEY={api-key} -e ENV_LK_SECRET_KEY={api-secret} -e LK_ROOM={room} --gpus all --privileged --device /dev/uinput --shm-size=4G -d livekit/steam-test:latest`

## How to build
- `docker build --platform linux/amd64 -t livekit/steam-test:latest -f Dockerfile.debian .`

## Troubleshooting
### issues with controls
- make sure the input-handler is started
- run `evtest` to get a list of inputs, make sure that the virtual mouse/keyboard are defined correctly in  `/etc/X11/xorg.conf` similar to the following block
- if changes are needed, restart xorg

```
Section "InputDevice"
    Identifier "Keyboard0"
    Driver "evdev"
    Option "Device" "/dev/input/event4" # You need to identify the correct event number for your keyboard
    Option "AutoServerLayout" "on"
EndSection

Section "InputDevice"
    Identifier "Mouse0"
    Driver "evdev"
    Option "Device" "/dev/input/event5" # You need to identify the correct event number for your mouse
    Option "AutoServerLayout" "on"
EndSection

Section "InputDevice"
    Identifier "MyGamepad"
    Driver "evdev"
    Option "Device" "/dev/input/event6"
    Option "Name" "Gamepad"
EndSection
```


# SECURITY WARNING
This is not production ready software. This code allows user input to the VM it is running on and is not secure. Do not run this and make it publicly available without understanding the security risks.
