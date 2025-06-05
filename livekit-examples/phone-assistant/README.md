# LiveKit Phone Assistant Agent - SIP REFER Example

## Overview

This repository contains an example implementation of a voice-enabled phone assistant using LiveKit and OpenAI. The `agent.py` module demonstrates how to handle voice interactions, DTMF signals, and SIP REFER transfers to different departments based on user input.

The assistant provides options for callers to be transferred to Billing, Technical Support, or Customer Service departments by pressing corresponding digits.

## Features

- **Voice Interaction**: Engages with users through voice using OpenAI's language models.
- **DTMF Handling**: Listens for DTMF signals (keypad inputs) and responds accordingly.
- **SIP REFER Transfer**: Transfers calls to different departments using SIP REFER requests.
- **Multimodal Agent**: Utilizes LiveKit's multimodal capabilities to handle both audio and text modalities.

## Prerequisites

- Python 3.7 or higher
- A LiveKit Cloud account or self-hosted LiveKit server
- OpenAI API key
- Required Python packages listed in `requirements.txt`
- A SIP Trunk with Twilio, connected to your LiveKit account as detailed [here](https://docs.livekit.io/sip/)

## Setup

### Clone the Repository

```bash
git clone https://github.com/ShayneP/phone-assistant.git
cd phone-assistant
```

### Create a Virtual Environment

It's always recommended to use a virtual environment to manage dependencies.

```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Environment Variables

Create a `.env.local` file in the root of the project with the following content:

```bash
OPENAI_API_KEY=your-openai-api-key
BILLING_PHONE_NUMBER=+12345678901
TECH_SUPPORT_PHONE_NUMBER=+12345678901
CUSTOMER_SERVICE_PHONE_NUMBER=+12345678901
LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

Replace the placeholder values with your actual API keys and phone numbers.

## Running the Assistant

To start the phone assistant agent in development mode, run:

```bash
python agent.py dev
```

When callers call the phone number that's attached to your SIP trunk, calls will be routed into LiveKit rooms.
When a room is created, your Agent will join, wait for the caller to finish connecting, and then greet the user. 

## How It Works

### Entry Point

The `entrypoint` function serves as the main entry for the assistant. It initializes the `PhoneAssistant` class and manages the connection lifecycle.

### PhoneAssistant Class

The `PhoneAssistant` class encapsulates the logic for:

- Connecting to a LiveKit room.
- Setting up event handlers for DTMF signals.
- Initializing and starting the multimodal agent.
- Handling SIP REFER transfers.

#### Connecting to the Room

The assistant connects to the LiveKit room and waits for a participant to join.

```python
participant = await assistant.connect_to_room()
```

#### Starting the Agent

Once connected, the assistant initializes the OpenAI model with specific instructions and starts the multimodal agent.

```python
assistant.start_agent(participant)
```

#### Greeting the Caller

Upon starting, the assistant greets the caller and provides options.

```python
greeting = (
    "Hi, thanks for calling Vandelay Industries!"
    "You can press 1 for Billing, 2 for Technical Support, "
    "or 3 for Customer Service. You can also just talk to me, since I'm a LiveKit agent."
)
asyncio.create_task(assistant.say(greeting))
```

#### Handling DTMF Signals

The assistant sets up an event handler for DTMF signals to determine if the caller presses any digits.

```python
@room.on("sip_dtmf_received")
def handle_dtmf(dtmf_event: rtc.SipDTMF):
    # Logic to handle DTMF digits and initiate transfer
```

#### SIP REFER Transfer

If the caller selects an option, the assistant uses SIP REFER to transfer the call to the appropriate department.

```python
await assistant.transfer_call(identity, transfer_number)
```

### Cleanup

After the call ends or the room is disconnected, the resources used by the agent are cleaned up.

```python
await assistant.cleanup()
```

## Customization

### Updating Department Options

You can customize the department options by modifying the `department_numbers` dictionary in the `_setup_event_handlers` method, and then changing the names of the phone numbers in your `.env.local` config file.

```python
department_numbers = {
    "1": ("BILLING_PHONE_NUMBER", "Billing"),
    "2": ("TECH_SUPPORT_PHONE_NUMBER", "Tech Support"),
    "3": ("CUSTOMER_SERVICE_PHONE_NUMBER", "Customer Service")
}
```

### Changing Greetings and Messages

Update the `greeting` variable and messages within the `say` method calls to change what the assistant says to the caller.

> Note: It's important to relay the application's intent to use *voice* in the `say` method, or OpenAI will occasionally respond with a stream of text.

## Logging

Logging is configured to output information to help with debugging and monitoring.

```python
logger = logging.getLogger("phone-assistant")
logger.setLevel(logging.INFO)
```

## References

- [LiveKit Python SDK](https://docs.livekit.io/guides/python)
- [LiveKit SIP Guide](https://docs.livekit.io/sip/)
- [OpenAI Realtime Integration Guide](https://docs.livekit.io/agents/openai/overview/)