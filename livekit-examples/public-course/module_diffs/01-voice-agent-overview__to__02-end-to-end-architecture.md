# Diff: 01-voice-agent-overview/src/agent.py → 02-end-to-end-architecture/src/agent.py

```diff
--- public_modules/01-voice-agent-overview/src/agent.py
+++ public_modules/02-end-to-end-architecture/src/agent.py
@@ -33,8 +33,6 @@
             You are curious, friendly, and have a sense of humor.""",
         )
 
-    # all functions annotated with @function_tool will be passed to the LLM when this
-    # agent is active
     @function_tool
     async def lookup_weather(self, context: RunContext, location: str):
         """Use this tool to look up current weather information in the given location.
@@ -55,41 +53,24 @@
 
 
 async def entrypoint(ctx: JobContext):
-    # Logging setup
-    # Add any other context you want in all log entries here
     ctx.log_context_fields = {
         "room": ctx.room.name,
     }
 
-    # Set up a voice AI pipeline using OpenAI, Cartesia, Deepgram, and the LiveKit turn detector
     session = AgentSession(
-        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
-        # See all providers at https://docs.livekit.io/agents/integrations/llm/
-        llm=openai.LLM(model="gpt-4o-mini"),
-        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
-        # See all providers at https://docs.livekit.io/agents/integrations/stt/
-        stt=deepgram.STT(model="nova-3", language="multi"),
-        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
-        # See all providers at https://docs.livekit.io/agents/integrations/tts/
-        tts=cartesia.TTS(voice="6f84f4b8-58a2-430c-8c79-688dad597532"),
-        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
-        # See more at https://docs.livekit.io/agents/build/turns
-        turn_detection=MultilingualModel(),
-        vad=ctx.proc.userdata["vad"],
-        # allow the LLM to generate a response while waiting for the end of turn
-        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
-        preemptive_generation=True,
+        llm=openai.LLM(),
+        stt=deepgram.STT(),
+        tts=openai.TTS(),
+        #turn_detection=MultilingualModel(),
+        #vad=ctx.proc.userdata["vad"],
+        #preemptive_generation=True,
     )
 
-    # sometimes background noise could interrupt the agent session, these are considered false positive interruptions
-    # when it's detected, you may resume the agent's speech
     @session.on("agent_false_interruption")
     def _on_agent_false_interruption(ev: AgentFalseInterruptionEvent):
         logger.info("false positive interruption, resuming")
-        session.generate_reply(instructions=ev.extra_instructions or NOT_GIVEN)
+        session.generate_reply(instructions=ev.extra_instructions or NOT_GIVEN)\
 
-    # Metrics collection, to measure pipeline performance
-    # For more information, see https://docs.livekit.io/agents/build/metrics/
     usage_collector = metrics.UsageCollector()
 
     @session.on("metrics_collected")
@@ -103,7 +84,6 @@
 
     ctx.add_shutdown_callback(log_usage)
 
-    # Start the session, which initializes the voice pipeline and warms up the models
     await session.start(
         agent=Assistant(),
         room=ctx.room,
@@ -112,7 +92,6 @@
         ),
     )
 
-    # Join the room and connect to the user
     await ctx.connect()
 
 
```
