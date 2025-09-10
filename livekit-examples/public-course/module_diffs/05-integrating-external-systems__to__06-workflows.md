# Diff: 05-integrating-external-systems/src/agent.py → 06-workflows/src/agent.py

```diff
--- public_modules/05-integrating-external-systems/src/agent.py
+++ public_modules/06-workflows/src/agent.py
@@ -9,6 +9,7 @@
     Agent,
     AgentFalseInterruptionEvent,
     AgentSession,
+    AgentTask,
     JobContext,
     JobProcess,
     MetricsCollectedEvent,
@@ -55,6 +56,75 @@
     set_tracer_provider(trace_provider)
 
 
+class CollectConsent(AgentTask[bool]):
+    def __init__(self, chat_ctx=None):
+        super().__init__(
+            instructions="""Ask for recording consent and get a clear yes or no answer.
+            Be polite and professional when asking for consent.""",
+            chat_ctx=chat_ctx
+        )
+
+    async def on_enter(self) -> None:
+        await self.session.generate_reply(
+            instructions="""Politely ask the user for permission to record this call for 
+            quality assurance and training purposes. Make it clear that they can decline."""
+        )
+
+    @function_tool
+    async def consent_given(self) -> None:
+        """Use this when the user gives consent to record."""
+        logger.info("User gave consent to record")
+        self.complete(True)
+
+    @function_tool
+    async def consent_denied(self) -> None:
+        """Use this when the user denies consent to record."""
+        logger.info("User denied consent to record")
+        self.complete(False)
+
+
+class FeedbackAgent(Agent):
+    def __init__(self, chat_ctx=None):
+        super().__init__(
+            instructions="""You are a feedback collector. Your job is to collect a rating 
+            from 1 to 10 about the user's experience with the call. Be friendly and grateful.
+            Once you have collected the rating, thank them and say goodbye.""",
+            chat_ctx=chat_ctx
+        )
+        self.rating = None
+
+    async def on_enter(self) -> None:
+        await self.session.generate_reply(
+            instructions="""Thank the user for their time and ask them to rate their experience 
+            on a scale from 1 to 10, where 1 is poor and 10 is excellent."""
+        )
+
+    @function_tool
+    async def record_rating(self, context: RunContext, rating: int):
+        """Use this tool to record the user's rating from 1 to 10.
+        
+        Args:
+            rating: The user's rating from 1 to 10
+        """
+        if rating < 1 or rating > 10:
+            return "Please provide a rating between 1 and 10."
+        
+        self.rating = rating
+        logger.info(f"User rated the interaction: {rating}/10")
+        
+        if rating >= 7:
+            await self.session.generate_reply(
+                instructions="Thank them for the positive feedback and say goodbye warmly."
+            )
+        else:
+            await self.session.generate_reply(
+                instructions="""Acknowledge their feedback, apologize for any inconvenience, 
+                and assure them their feedback will help improve the service. Then say goodbye."""
+            )
+        
+        return f"Rating recorded: {rating}/10"
+
+
 class Assistant(Agent):
     def __init__(self) -> None:
         super().__init__(
@@ -63,6 +133,30 @@
             Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
             You are curious, friendly, and have a sense of humor.""",
         )
+    
+    async def on_enter(self) -> None:
+        from livekit.agents import get_job_context
+        
+        # Collect consent before proceeding with the main conversation
+        consent_given = await CollectConsent(chat_ctx=self.chat_ctx)
+        
+        if consent_given:
+            logger.info("User consented to recording, proceeding with conversation")
+            await self.session.generate_reply(
+                instructions="""The user has consented to recording. Now greet them warmly and 
+                offer your assistance with any questions they may have."""
+            )
+        else:
+            logger.info("User did not consent to recording, ending call")
+            await self.session.say("Since consent is required to continue this call, we're unable to help you. Goodbye!")
+            job_ctx = get_job_context()
+            await job_ctx.shutdown(reason="Recording consent not given")
+
+    @function_tool
+    async def end_call(self, context: RunContext):
+        """Use this when the user wants to end the call or finish the conversation."""
+        logger.info("User requested to end the call, transferring to feedback agent")
+        return "Transferring to collect feedback", FeedbackAgent(chat_ctx=self.chat_ctx)
 
     @function_tool
     async def lookup_weather(self, context: RunContext, location: str):
@@ -114,7 +208,8 @@
             [
                 deepgram.STT(filler_words=True),
                 openai.STT(),
-            ]
+            ],
+            vad=ctx.proc.userdata["vad"],
         ),
         tts=tts.FallbackAdapter(
             [
```
