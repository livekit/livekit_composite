---
title: Building an Automated IVR Menu Caller
description: Build an AI agent that can call phone numbers and navigate IVR menus by listening and sending DTMF codes.
---

In this recipe, build an AI agent that calls phone numbers and navigates automated IVR menus. The guide focuses on how the
agent listens for menu options and sends DTMF codes at the right time.

## Prerequisites

To complete this guide, you need the following prerequisites:

- Create an agent using the [Voice Agent quickstart](/agents/quickstarts/voice-agent).

- Set up LiveKit SIP to make outgoing calls:

  - [Create and configure a SIP trunk](/sip/quickstarts/configuring-sip-trunk/) with your trunking provider.
  - Create an [outbound trunk](/sip/trunk-outbound).

## Setting up DTMF functionality

The following function sends DTMF codes with a cooldown, preventing accidental rapid presses:

```python
async def send_dtmf_code(
    code: Annotated[
        int, llm.TypeInfo(description="The DTMF code to send to the phone number for the current step.")
    ],
):
    """Called when you need to send a DTMF code to the phone number for the current step."""
    nonlocal last_dtmf_press
    current_time = time.time()
    
    # Check if enough time has passed since last press (3 second cooldown)
    if current_time - last_dtmf_press < 3:
        logger.info("DTMF code rejected due to cooldown")
        return None
        
    logger.info(f"Sending DTMF code {code} to the phone number for the current step.")
    last_dtmf_press = current_time
    
    await ctx.room.local_participant.publish_dtmf(
        code=code,
        digit=str(code)
    )
    await ctx.room.local_participant.publish_data(
        f"{code}",
        topic="dtmf_code"
    )
    return None
```

## Initializing the VoicePipelineAgent

Set up the `VoicePipelineAgent`, using Deepgram for STT and Cartesia for TTS:

```python
def prewarm(proc: JobProcess): 
    proc.userdata["vad"] = silero.VAD.load()

agent = VoicePipelineAgent(
    vad=ctx.proc.userdata["vad"],
    stt=deepgram.STT(),
    llm=openai.LLM(),
    tts=cartesia.TTS(),
    fnc_ctx=fnc_ctx,
    min_endpointing_delay=0.75 # We'll use a higher endpointing delay here to reduce the chance of cutting off the IVR system before it's finished playing the message
)
```

## Handling SIP participants

When a SIP participant connects, the instructions for the agent are based on their assigned "task." For instance, you might store this info as a [participant attribute in the frontend](/home/client/data/participant-attributes/#usage-from-livekit-sdks).

```python
@ctx.room.on("participant_connected")
def on_participant_connected(participant: rtc.RemoteParticipant):
    logger.info(f"new participant joined {participant.identity}")
    if "sip_" in participant.identity:
        task = participant._info.attributes.get("task")
        logger.info(f"task: {task}")
        agent.chat_ctx.append(
            role="system",
            text=(
                f"""
                You are a person who is calling a phone number to accomplish a task.
                Speak from the perspective of the caller. 
                Your goal as the caller is to: {task}.
                Listen carefully and pick the most appropriate option from the IVR menu.
                """
            )
        )
        agent.start(ctx.room, participant)
```

## Starting the agent

The following example is the full entrypoint showing how it all connects:

```python
async def entrypoint(ctx: JobContext):
    logger.info("starting entrypoint")

    fnc_ctx = llm.FunctionContext()
    last_dtmf_press = 0  # Track the last DTMF press timestamp

    # Register the DTMF function with the function context
    @fnc_ctx.ai_callable()
    async def send_dtmf_code(
        code: Annotated[
            int, llm.TypeInfo(description="The DTMF code to send to the phone number for the current step.")
        ],
    ):
        """Called when you need to send a DTMF code to the phone number for the current step."""
        nonlocal last_dtmf_press
        current_time = time.time()
        
        if current_time - last_dtmf_press < 3:
            logger.info("DTMF code rejected due to cooldown")
            return None
            
        logger.info(f"Sending DTMF code {code} to the phone number for the current step.")
        last_dtmf_press = current_time
        
        await ctx.room.local_participant.publish_dtmf(
            code=code,
            digit=str(code)
        )
        await ctx.room.local_participant.publish_data(
            f"{code}",
            topic="dtmf_code"
        )
        return None

    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=openai.LLM(),
        tts=cartesia.TTS(),
        fnc_ctx=fnc_ctx,
        min_endpointing_delay=0.75
    )

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info(f"new participant joined {participant.identity}")
        if "sip_" in participant.identity:
            task = participant._info.attributes.get("task")
            logger.info(f"task: {task}")
            agent.chat_ctx.append(
                role="system",
                text=(
                    f"""
                    You are a person who is calling a phone number to accomplish a task.
                    Speak from the perspective of the caller. 
                    Your goal as the caller is to: {task}.
                    Listen carefully and pick the most appropriate option from the IVR menu.
                    """
                )
            )
            agent.start(ctx.room, participant)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
```

For a complete working example, see the [IVR agent repository](https://github.com/ShayneP/ivr-agent).
