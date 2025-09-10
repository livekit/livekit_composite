# Diff: 04-optimizing-latency/src/agent.py → 05-integrating-external-systems/src/agent.py

```diff
--- public_modules/04-optimizing-latency/src/agent.py
+++ public_modules/05-integrating-external-systems/src/agent.py
@@ -1,6 +1,7 @@
+import logging
 import base64
-import logging
 import os
+import aiohttp
 
 from dotenv import load_dotenv
 from livekit.agents import (
@@ -16,8 +17,9 @@
     WorkerOptions,
     cli,
     metrics,
+    mcp,
+    llm,
     stt,
-    llm,
     tts
 )
 from livekit.agents.llm import function_tool
@@ -74,7 +76,21 @@
 
         logger.info(f"Looking up weather for {location}")
 
-        return "sunny with a temperature of 70 degrees."
+        try:
+            async with aiohttp.ClientSession() as session:
+                async with session.get(f"http://shayne.app/weather?location={location}") as response:
+                    if response.status == 200:
+                        data = await response.json()
+                        condition = data.get("condition", "unknown")
+                        temperature = data.get("temperature", "unknown")
+                        unit = data.get("unit", "degrees")
+                        return f"{condition} with a temperature of {temperature} {unit}"
+                    else:
+                        logger.error(f"Weather API returned status {response.status}")
+                        return "Weather information is currently unavailable for this location."
+        except Exception as e:
+            logger.error(f"Error fetching weather: {e}")
+            return "Weather service is temporarily unavailable."
 
 
 def prewarm(proc: JobProcess):
@@ -82,8 +98,7 @@
 
 
 async def entrypoint(ctx: JobContext):
-    setup_langfuse()  # set up the langfuse tracer
-
+    setup_langfuse()
     ctx.log_context_fields = {
         "room": ctx.room.name,
     }
@@ -110,6 +125,9 @@
         turn_detection=MultilingualModel(),
         vad=ctx.proc.userdata["vad"],
         preemptive_generation=True,
+        mcp_servers=[
+            mcp.MCPServerHTTP(url="https://shayne.app/sse"),
+        ],
     )
 
     @session.on("agent_false_interruption")
```
