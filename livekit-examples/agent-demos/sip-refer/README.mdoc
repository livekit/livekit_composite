---
title: Company directory phone assistant
description: Build a phone assistant that can transfer calls to different departments using SIP REFER.
---

In this recipe, build a phone assistant that transfers callers to different departments via SIP REFER. This guide focuses on how to set up DTMF handling and how to manage the actual call transfers to Billing, Technical Support, or Customer Service.

## Prerequisites

To complete this guide, you need the following prerequisites:

- Create an agent using the [Multimodal agent quickstart](/agents/quickstarts/s2s).
- Set up LiveKit SIP to [accept inbound calls](/sip/accepting-calls/#setup-for-accepting-calls).

## Implementing the phone assistant

The following is a class that handles basic setup logic for the phone assistant. Because there isn't a direct TTS service,
add a `say` method for generating voice responses:

```python
class PhoneAssistant:
    def __init__(self, context: JobContext):
        self.context = context
        self.assistant = None
        self.model = None
        self.livekit_api = None

    async def say(self, message: str) -> None:
        if self.model and hasattr(self.model, 'sessions'):
            session = self.model.sessions[0]
            session.conversation.item.create(
                llm.ChatMessage(
                    role="assistant",
                    content=f"Using your voice to respond, please say: {message}"
                )
            )
            session.response.create()

    async def connect_to_room(self) -> rtc.Participant:
        logger.info(f"Connecting to room: {self.context.room.name}")
        await self.context.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
        self._setup_event_handlers(self.context.room)
        participant = await self.context.wait_for_participant()
        return participant
```

## Setting up DTMF handling

The assistant should listen for DTMF tones and transfer callers to the right department. Here’s the relevant setup:

```python
def _setup_event_handlers(self, room: rtc.Room) -> None:
    @room.on("sip_dtmf_received")
    def handle_dtmf(dtmf_event: rtc.SipDTMF):
        code = dtmf_event.code
        digit = dtmf_event.digit
        identity = dtmf_event.participant.identity

        department_numbers = {
            "1": ("BILLING_PHONE_NUMBER", "Billing"),
            "2": ("TECH_SUPPORT_PHONE_NUMBER", "Tech Support"),
            "3": ("CUSTOMER_SERVICE_PHONE_NUMBER", "Customer Service")
        }

        if digit in department_numbers:
            env_var, dept_name = department_numbers[digit]
            transfer_number = f"tel:{os.getenv(env_var)}"
            asyncio.create_task(self._handle_transfer(identity, transfer_number, dept_name))
        else:
            asyncio.create_task(self.say("I'm sorry, please choose one of the options I mentioned earlier."))

    async def _handle_transfer(self, identity: str, transfer_number: str, department: str) -> None:
        await self.say(f"Transferring you to our {department} department in a moment. Please hold.")
        await asyncio.sleep(6)  # Give time for the transfer message to be spoken
        await self.transfer_call(identity, transfer_number)
```

## Handling transfers

Handle the call transfer using SIP REFER:

```python
async def transfer_call(self, participant_identity: str, transfer_to: str) -> None:
    try:
        if not self.livekit_api:
            livekit_url = os.getenv('LIVEKIT_URL')
            api_key = os.getenv('LIVEKIT_API_KEY')
            api_secret = os.getenv('LIVEKIT_API_SECRET')
            self.livekit_api = api.LiveKitAPI(
                url=livekit_url,
                api_key=api_key,
                api_secret=api_secret
            )

        transfer_request = proto_sip.TransferSIPParticipantRequest(
            participant_identity=participant_identity,
            room_name=self.context.room.name,
            transfer_to=transfer_to,
            play_dialtone=True
        )

        await self.livekit_api.sip.transfer_sip_participant(transfer_request)

    except Exception as e:
        await self.say("I'm sorry, I couldn't transfer your call. Is there something else I can help with?")
```

## Starting the agent

Here’s how to initialize and start a MultimodalAgent to act as a phone assistant:

```python
def start_agent(self, participant: rtc.Participant) -> None:
    self.model = openai.realtime.RealtimeModel(
        instructions=(
            "You are a friendly assistant providing support. "
            "Please inform users they can:\n"
            "- Press 1 for Billing\n"
            "- Press 2 for Technical Support\n"
            "- Press 3 for Customer Service"
        ),
        modalities=["audio", "text"],
        voice="sage"
    )

    self.assistant = MultimodalAgent(model=self.model)
    self.assistant.start(self.context.room, participant)

    greeting = (
        "Hi, thanks for calling Vandelay Industries! "
        "You can press 1 for Billing, 2 for Technical Support, "
        "or 3 for Customer Service. You can also just talk to me, since I'm a LiveKit agent."
    )
    asyncio.create_task(self.say(greeting))
```

Below is the entrypoint that puts everything together:

```python
async def entrypoint(context: JobContext) -> None:
    assistant = PhoneAssistant(context)
    disconnect_event = asyncio.Event()

    @context.room.on("disconnected")
    def on_room_disconnect(*args):
        disconnect_event.set()

    try:
        participant = await assistant.connect_to_room()
        assistant.start_agent(participant)
        await disconnect_event.wait()
    finally:
        await assistant.cleanup()

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

For the complete code, see the [phone assistant repository](https://github.com/livekit-examples/phone-assistant).
