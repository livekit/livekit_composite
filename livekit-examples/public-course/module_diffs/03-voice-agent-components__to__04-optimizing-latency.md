# Diff: 03-voice-agent-components/src/agent.py → 04-optimizing-latency/src/agent.py

```diff
--- public_modules/03-voice-agent-components/src/agent.py
+++ public_modules/04-optimizing-latency/src/agent.py
@@ -1,4 +1,6 @@
+import base64
 import logging
+import os
 
 from dotenv import load_dotenv
 from livekit.agents import (
@@ -19,12 +21,36 @@
     tts
 )
 from livekit.agents.llm import function_tool
+from livekit.agents.telemetry import set_tracer_provider
 from livekit.plugins import cartesia, deepgram, noise_cancellation, openai, silero
 from livekit.plugins.turn_detector.multilingual import MultilingualModel
 
 logger = logging.getLogger("agent")
 
 load_dotenv(".env.local")
+
+
+def setup_langfuse(
+    host: str | None = None, public_key: str | None = None, secret_key: str | None = None
+):
+    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
+    from opentelemetry.sdk.trace import TracerProvider
+    from opentelemetry.sdk.trace.export import BatchSpanProcessor
+
+    public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY")
+    secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY")
+    host = host or os.getenv("LANGFUSE_HOST")
+
+    if not public_key or not secret_key or not host:
+        raise ValueError("LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and LANGFUSE_HOST must be set")
+
+    langfuse_auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
+    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = f"{host.rstrip('/')}/api/public/otel"
+    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Basic {langfuse_auth}"
+
+    trace_provider = TracerProvider()
+    trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
+    set_tracer_provider(trace_provider)
 
 
 class Assistant(Agent):
@@ -56,6 +82,8 @@
 
 
 async def entrypoint(ctx: JobContext):
+    setup_langfuse()  # set up the langfuse tracer
+
     ctx.log_context_fields = {
         "room": ctx.room.name,
     }
@@ -63,20 +91,20 @@
     session = AgentSession(
         llm=llm.FallbackAdapter(
             [
+                openai.LLM(model="gpt-4o-mini"),
                 openai.LLM(model="gpt-4.1"),
-                openai.LLM(model="gpt-4o-mini"),
             ]
         ),
         stt=stt.FallbackAdapter(
             [
+                deepgram.STT(filler_words=True),
                 openai.STT(),
-                deepgram.STT(filler_words=True),
             ]
         ),
         tts=tts.FallbackAdapter(
             [
+                deepgram.TTS(),
                 openai.TTS(),
-                deepgram.TTS(),
             ]
         ),
         turn_detection=MultilingualModel(),
```
