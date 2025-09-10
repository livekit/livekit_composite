# Diff: 02-end-to-end-architecture/src/agent.py → 03-voice-agent-components/src/agent.py

```diff
--- public_modules/02-end-to-end-architecture/src/agent.py
+++ public_modules/03-voice-agent-components/src/agent.py
@@ -14,6 +14,9 @@
     WorkerOptions,
     cli,
     metrics,
+    stt,
+    llm,
+    tts
 )
 from livekit.agents.llm import function_tool
 from livekit.plugins import cartesia, deepgram, noise_cancellation, openai, silero
@@ -58,18 +61,33 @@
     }
 
     session = AgentSession(
-        llm=openai.LLM(),
-        stt=deepgram.STT(),
-        tts=openai.TTS(),
-        #turn_detection=MultilingualModel(),
-        #vad=ctx.proc.userdata["vad"],
-        #preemptive_generation=True,
+        llm=llm.FallbackAdapter(
+            [
+                openai.LLM(model="gpt-4.1"),
+                openai.LLM(model="gpt-4o-mini"),
+            ]
+        ),
+        stt=stt.FallbackAdapter(
+            [
+                openai.STT(),
+                deepgram.STT(filler_words=True),
+            ]
+        ),
+        tts=tts.FallbackAdapter(
+            [
+                openai.TTS(),
+                deepgram.TTS(),
+            ]
+        ),
+        turn_detection=MultilingualModel(),
+        vad=ctx.proc.userdata["vad"],
+        preemptive_generation=True,
     )
 
     @session.on("agent_false_interruption")
     def _on_agent_false_interruption(ev: AgentFalseInterruptionEvent):
         logger.info("false positive interruption, resuming")
-        session.generate_reply(instructions=ev.extra_instructions or NOT_GIVEN)\
+        session.generate_reply(instructions=ev.extra_instructions or NOT_GIVEN)
 
     usage_collector = metrics.UsageCollector()
 
```
