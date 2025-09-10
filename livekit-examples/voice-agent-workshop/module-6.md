# Collecting recording consent

In this exercise, we'll add a task to the agent to collect recording consent.

Step 1: Add the import to the `agent.py` file:

    ```python
    from livekit.agents import AgentTask
    ```

Step 2: Define the `CollectConsent` class:

    ```python
    class CollectConsent(AgentTask[bool]):
        def __init__(self, chat_ctx=None):
            super().__init__(
                instructions="""
                Ask for recording consent and get a clear yes or no answer.
                Be polite and professional.
                """,
                chat_ctx=chat_ctx,
            )

    async def on_enter(self) -> None:
        await self.session.generate_reply(instructions="""
        Briefly introduce yourself, then ask for permission to record the call for quality assurance and training purposes.
        Make it clear that they can decline.
        ```

    @function_tool
    async def consent_given(self) -> None:
        """Use this when the user gives consent to record."""
        self.complete(True)

    @function_tool
    async def consent_denied(self) -> None:
        """Use this when the user denies consent to record."""
        self.complete(False)
    ```

Step 3: Start the task in the `Assistant` class's `on_enter` method, then proceed based on the result:

    ```python
    async def on_enter(self) -> None:
        if await CollectConsent(chat_ctx=self.chat_ctx):
            logger.info("User gave consent to record.")
            await self.session.generate_reply(instructions="Thank the user for their consent then offer your assistance.")
        else:
            logger.info("User did not give consent to record.")
            await self.session.generate_reply(instructions="Let the user know that the call will not be recorded, then offer your assistance.")
    ```

# Add a handoff

In this exercise, we'll add a handoff to the agent.

Step 1: Create another agent to handoff to:

    ```python
    class Manager(Agent):
        def __init__(self, chat_ctx=None):
            super().__init__(
                instructions="""You are a manager for a team of helpful voice AI assistants. 
                A customer has been escalated to you.
                Provide your assistant and be professional.
                """,
                tts=openai.TTS(voice="coral"),
                chat_ctx=chat_ctx,
            )
    ```

Step 2: Add the handoff to the `Assistant` class, as a function tool:

    ```python
    @function_tool
    async def escalate_to_manager(self, context: RunContext):
        """Use this tool to escalate the call to the manager, upon user request."""
        return Manager(chat_ctx=self.chat_ctx), "Escalating to manager..."
    ```

Now you can ask the assistant to escalate to the manager.