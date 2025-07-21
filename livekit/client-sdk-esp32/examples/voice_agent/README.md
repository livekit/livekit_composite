# Voice Agent

Example application combining this SDK with [LiveKit Agents](https://docs.livekit.io/agents/), enabling bidirectional voice communication with an AI agent. The agent can interact with hardware in response to user requests. Below is an example of a conversation between a user and the agent:

> **User:** What is the current CPU temperature? \
> **Agent:** The CPU temperature is currently 33°C.

> **User:** Turn on the blue LED. \
> **Agent:** *[turns blue LED on]*

> **User:** Turn on the yellow LED. \
> **Agent:** I'm sorry, the board does not have a yellow LED.

## Requirements

- Software:
    - [IDF](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/get-started/index.html) release v5.4 or later
    - Python 3.9 or later
    - LiveKit Cloud Project
    - Sandbox Token Server (created from your cloud project)
    - API keys for OpenAI, Deepgram, and Cartesia.
- Hardware
    - Dev board: [ESP32-S3-Korvo-2](https://docs.espressif.com/projects/esp-adf/en/latest/design-guide/dev-boards/user-guide-esp32-s3-korvo-2.html)
    - Two micro USB cables: one for power, one for flashing
    - Mono enclosed speaker (example from [Adafruit](https://www.adafruit.com/product/3351))

## Run example

To run the example on your board, begin in your terminal by navigating to the example's root directory: *[examples/voice_agent](./examples/voice_agent/)*.

### 1. Configuration

The example requires a network connection and Sandbox ID from your [LiveKit Cloud Project](https://cloud.livekit.io/projects/p_/sandbox/templates/token-server). To configure these settings from your terminal, launch *menuconfig*:
```sh
idf.py menuconfig
```

With *menuconfig* open, navigate to the *LiveKit Example* menu and configure the following settings:

- Network → Wi-Fi SSID
- Network → Wi-Fi password
- Room connection → Sandbox ID

For more information about available options, please refer to [this guide](../README.md#configuration).

### 2. Build & flash

Begin by connecting your dev board via USB. With the board connected, use the following command
to build the example, flash it to your board, and monitor serial output:

```sh
idf.py flash monitor
```

Once running on device, the example will establish a network connection and then connect to a LiveKit room. Once connected, you will see the following log message:

```sh
I (19508) livekit_example: Room state: connected
```

If you encounter any issues during this process, please refer to the example [troubleshooting guide](../README.md/#troubleshooting).

## Run agent

With the example running on your board, the next step is to run the agent so it can join the room.
Begin by navigating to the agent's source directory in your terminal: *[examples/voice_agent/agent](../voice_agent/agent)*.

In this directory, create a *.env* file containing the required API keys:

```sh
DEEPGRAM_API_KEY=<your Deepgram API Key>
OPENAI_API_KEY=<your OpenAI API Key>
CARTESIA_API_KEY=<your Cartesia API Key>
LIVEKIT_API_KEY=<your API Key>
LIVEKIT_API_SECRET=<your API Secret>
LIVEKIT_URL=<your server URL>
```

With the API keys in place, download the required files and run the agent in development mode as follows:

```sh
python agent.py download-files
python agent.py dev
```

With the agent running, it will discover and join the room, and you will now be able to engage in two-way conversation. Try asking some of the questions shown above.