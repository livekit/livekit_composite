"""
LiveKit Phone Assistant Agent
This module implements a voice/text-enabled phone assistant using LiveKit and OpenAI.
"""
from __future__ import annotations

import asyncio
import logging
import os
from dotenv import load_dotenv
from livekit import rtc, api
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.protocol import sip as proto_sip
from livekit.agents.multimodal import MultimodalAgent
from livekit.plugins import openai


# Initialize environment variables
# The .env.local file should look like:
#   OPENAI_API_KEY=your-key-here
#   BILLING_PHONE_NUMBER=+12345678901
#   TECH_SUPPORT_PHONE_NUMBER=+12345678901
#   CUSTOMER_SERVICE_PHONE_NUMBER=+12345678901
#   LIVEKIT_URL=wss://your-url-goes-here.livekit.cloud
#   LIVEKIT_API_KEY=your-key-here
#   LIVEKIT_API_SECRET=your-secret-here
load_dotenv(dotenv_path=".env.local")

# Initialize logging
logger = logging.getLogger("phone-assistant")
logger.setLevel(logging.INFO)


class PhoneAssistant:
    """
    A simple multimodal phone assistant that handles voice interactions. You can transfer the call to a department
    based on the DTMF digit pressed by the user.
    """

    def __init__(self, context: JobContext):
        """
        Initialize the PhoneAssistant with the context about the room, participant, etc.

        Args:
            context (JobContext): The context for the job.
        """
        self.context = context
        self.assistant = None
        self.model = None
        self.livekit_api = None

    async def say(self, message: str) -> None:
        """
        Ask the assistant to speak a message to the user. The assistant needs to be told to use its
        voice to respond. If you don't do this, the assistant may respond with text instead of voice,
        which doesn't make much sense on a phone call.

        Args:
            message (str): The message to say.
        """
        if self.model and hasattr(self.model, 'sessions'):
            session = self.model.sessions[0]
            session.conversation.item.create(
                llm.ChatMessage(
                    role="assistant",
                    content=f"Using your voice to respond, please say: {message}"
                )
            )
            session.response.create()
            logger.debug(f"Asked assistant to say: {message}")

    async def connect_to_room(self) -> rtc.Participant:
        """
        Connect to the LiveKit room and wait for a participant to join.

        Returns:
            rtc.Participant: The connected participant.
        """
        room_name = self.context.room.name
        logger.info(f"Connecting to room: {room_name}")
        await self.context.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
        self._setup_event_handlers(self.context.room)
        participant = await self.context.wait_for_participant()
        return participant

    def _setup_event_handlers(self, room: rtc.Room) -> None:
        """
        Set up event handlers for any room events we care about. In this case, it's only the DTMF codes,
        but you could handle any other room events too.

        Args:
            room (rtc.Room): The LiveKit room instance.
        """

        @room.on("sip_dtmf_received")
        def handle_dtmf(dtmf_event: rtc.SipDTMF):
            """
            Handle DTMF (Dual-Tone Multi-Frequency) signals received from SIP. (These are the sounds
            that are made when a user presses a number on a phone keypad.)

            Args:
                dtmf_event (rtc.SipDTMF): The DTMF event data.
            """
            code = dtmf_event.code
            digit = dtmf_event.digit
            identity = dtmf_event.participant.identity
            logger.info(f"DTMF received - Code: {code}, Digit: '{digit}'")

            # Define department mapping
            department_numbers = {
                "1": ("BILLING_PHONE_NUMBER", "Billing"),
                "2": ("TECH_SUPPORT_PHONE_NUMBER", "Tech Support"),
                "3": ("CUSTOMER_SERVICE_PHONE_NUMBER", "Customer Service")
            }
            logger.info(f"Department numbers: {department_numbers}")
            if digit in department_numbers:
                env_var, dept_name = department_numbers[digit]
                transfer_number = f"tel:{os.getenv(env_var)}"
                asyncio.create_task(self._handle_transfer(identity, transfer_number, dept_name))
            else:
                asyncio.create_task(self.say("I'm sorry, please choose one of the options I mentioned earlier."))


    async def _handle_transfer(self, identity: str, transfer_number: str, department: str) -> None:
        """
        Handle the transfer process with department-specific messaging.

        Args:
            identity (str): The participant's identity
            transfer_number (str): The number to transfer to
            department (str): The name of the department
        """
        await self.say(f"Transferring you to our {department} department in a moment. Please hold.")
        await asyncio.sleep(6)
        await self.transfer_call(identity, transfer_number)


    def start_agent(self, participant: rtc.Participant) -> None:
        """
        Initialize and start the multimodal agent.

        Args:
            participant (rtc.Participant): The participant to interact with.
        """

        # Initialize the OpenAI model with updated instructions
        self.model = openai.realtime.RealtimeModel(
            instructions=(
                "You are a friendly assistant providing support. "
                "Please inform users they can:\n"
                "- Press 1 for Billing\n"
                "- Press 2 for Technical Support\n"
                "- Press 3 for Customer Service"
            ),
            # We use Audio for voice, and text to feed the model context behind the scenes.
            # Whenever we use text, it's important to make sure the model knows it's supposed 
            # to respond with voice. We do this with prompt engineering throughout the agent.
            modalities=["audio", "text"],
            voice="sage"
        )

        # Create and start the multimodal agent
        self.assistant = MultimodalAgent(model=self.model)
        self.assistant.start(self.context.room, participant)

        # Greeting with menu options. This is the first thing the assistant says to the user.
        # You don't need to have a greeting, but it's a good idea to have one if calls are incoming.
        greeting = (
            "Hi, thanks for calling Vandelay Industries — global leader in fine latex goods!"
            "You can press 1 for Billing, 2 for Technical Support, "
            "or 3 for Customer Service. You can also just talk to me, since I'm a LiveKit agent."
        )
        asyncio.create_task(self.say(greeting))

    async def transfer_call(self, participant_identity: str, transfer_to: str) -> None:
        """
        Transfer the SIP call to another number. This will essentially end the current call and start a new one,
        the PhoneAssistant will no longer be active on the call.

        Args:
            participant_identity (str): The identity of the participant.
            transfer_to (str): The phone number to transfer the call to.
        """
        logger.info(f"Transferring call for participant {participant_identity} to {transfer_to}")

        try:
            # Initialize LiveKit API client if not already done
            if not self.livekit_api:
                livekit_url = os.getenv('LIVEKIT_URL')
                api_key = os.getenv('LIVEKIT_API_KEY')
                api_secret = os.getenv('LIVEKIT_API_SECRET')
                logger.debug(f"Initializing LiveKit API client with URL: {livekit_url}")
                self.livekit_api = api.LiveKitAPI(
                    url=livekit_url,
                    api_key=api_key,
                    api_secret=api_secret
                )

            # Create transfer request
            transfer_request = proto_sip.TransferSIPParticipantRequest(
                participant_identity=participant_identity,
                room_name=self.context.room.name,
                transfer_to=transfer_to,
                play_dialtone=True
            )
            logger.debug(f"Transfer request: {transfer_request}")

            # Perform transfer
            await self.livekit_api.sip.transfer_sip_participant(transfer_request)
            logger.info(f"Successfully transferred participant {participant_identity} to {transfer_to}")

        except Exception as e:
            logger.error(f"Failed to transfer call: {e}", exc_info=True)
            await self.say("I'm sorry, I couldn't transfer your call. Is there something else I can help with?")

    async def cleanup(self) -> None:
        """
        Clean up resources before shutting down.
        """
        if self.livekit_api:
            await self.livekit_api.aclose()
            self.livekit_api = None


async def entrypoint(context: JobContext) -> None:
    """
    The main entry point for the phone assistant application.

    Args:
        context (JobContext): The context for the job.
    """
    assistant = PhoneAssistant(context)
    disconnect_event = asyncio.Event()

    @context.room.on("disconnected")
    def on_room_disconnect(*args):
        disconnect_event.set()

    try:
        participant = await assistant.connect_to_room()
        assistant.start_agent(participant)
        # Wait until the room is disconnected
        await disconnect_event.wait()
    finally:
        await assistant.cleanup()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))