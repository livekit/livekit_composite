import asyncio
import logging
from typing import Optional
from livekit.agents.pipeline import VoicePipelineAgent

logger = logging.getLogger("inactivity-handler")

class InactivityHandler:
    def __init__(self, 
                 timeout_seconds: int = 10, 
                 inactivity_message: str = "Are you still there? Let me know if you need any help."):
        self._timeout = timeout_seconds
        self._inactivity_message = inactivity_message
        self._last_activity_time = asyncio.Event()
        self._last_activity_time.set()  # Initialize as active
        self._inactivity_task: Optional[asyncio.Task] = None
        self._agent: Optional[VoicePipelineAgent] = None

    async def _check_inactivity(self):
        while True:
            try:
                await asyncio.wait_for(self._last_activity_time.wait(), self._timeout)
                self._last_activity_time.clear()
            except asyncio.TimeoutError:
                if self._agent:
                    await self._agent.say(self._inactivity_message)
            await asyncio.sleep(1)

    def start(self, agent: VoicePipelineAgent):
        """Start the inactivity checker with the given agent"""
        self._agent = agent
        self._inactivity_task = asyncio.create_task(self._check_inactivity())
        
        # Set up the activity handler
        @agent.on("user_started_speaking")
        def user_started_speaking():
            self._last_activity_time.set()

    def stop(self):
        """Stop the inactivity checker"""
        if self._inactivity_task:
            self._inactivity_task.cancel()
            self._inactivity_task = None 