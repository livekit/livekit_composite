#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "sounddevice",
# ]
# ///

import sounddevice as sd

def list_audio_devices():
    """List all available audio devices for debugging using SoundDevice"""
    print("\n=== AUDIO DEVICES DEBUG (SoundDevice) ===")
    try:
        devices = sd.query_devices()
        print(f"Total devices found: {len(devices)}")
        for i, device in enumerate(devices):
            print(f"Device {i}: {device['name']}")
            print(f"  Channels: in={device['max_input_channels']}, out={device['max_output_channels']}")
            print(f"  Sample rates: {device['default_samplerate']}")
            print(f"  Hostapi: {device['hostapi']}")
        
        default_in, default_out = sd.default.device
        print(f"\nDefault input device: {default_in}")
        print(f"Default output device: {default_out}")
        
        if default_in is not None:
            in_info = sd.query_devices(default_in)
            print(f"Default input info: {in_info['name']} - {in_info['max_input_channels']} channels")
        
        if default_out is not None:
            out_info = sd.query_devices(default_out)
            print(f"Default output info: {out_info['name']} - {out_info['max_output_channels']} channels")
            
    except Exception as e:
        print(f"Error listing audio devices: {e}")
    print("=== END AUDIO DEVICES ===\n")


if __name__ == "__main__":
    # List devices using both methods for comparison
    list_audio_devices()  # SoundDevice method