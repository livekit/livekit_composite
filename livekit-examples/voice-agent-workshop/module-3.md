# Customizing the agent's behavior

Exercise 1: Change the agent's instructions and personality. Modify the system prompt in the `Assistant` class:

    ```python
    instructions="""
    You are a hilariously funny voice AI assistant.
    You are also a bit sarcastic.
    Assist the user, but don't be too helpful.
    """,
    ```

Exercise 2: Change the agent's voice. Modify the `openai.TTS` constructor:

    ```python
    tts=openai.TTS(voice="ash"),
    ```

Exercise 3: Add the fallback adapters. 

    Import the `stt`, `llm`, `tts` modules:

    ```python
    from livekit.agents import stt, llm, tts
    ```

    Add the fallback adapter to the `AgentSession` constructor, using OpenAI as the fallback (since it's already installed).

    Extract the VAD from the `AgentSession` constructor:

    ```python
    vad = silero.VAD.load()
    # ...
    vad=vad,
    ```

    Add the fallback adapters to the `AgentSession` constructor:

    ```python
    llm=llm.FallbackAdapter(
        [
            openai.LLM(model="gpt-4.1"),
            openai.LLM(model="gpt-4o-mini"),
        ]
    ),
    stt=stt.FallbackAdapter(
        [
            deepgram.STT(model="nova-3", language="multi"),
            stt.StreamAdapter(stt=openai.STT(model="gpt-4o-transcribe"), vad=vad),
        ]
    ),
    tts=tts.FallbackAdapter(
        [
            openai.TTS(voice="ash"),
            deepgram.TTS(),
        ]
    ),
    ```
