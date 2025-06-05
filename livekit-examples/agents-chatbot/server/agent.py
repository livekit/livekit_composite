import json
import logging
from livekit import agents, rtc
from chatgpt import (
    ChatGPTMessage,
    ChatGPTMessageRole,
    ChatGPTPlugin,
)

from dotenv import load_dotenv

load_dotenv()

CHATGPT_MODEL = "gpt-3.5-turbo"  # "gpt-4-1106-preview"
CHATGPT_PROMPT = ""


class TextStreamingAgent:
    @classmethod
    async def create(cls, ctx: agents.JobContext):
        agent = TextStreamingAgent(ctx)
        await agent.start()

    def __init__(self, ctx: agents.JobContext):
        self.ctx = ctx
        self.chatgpt_plugin = ChatGPTPlugin(
            prompt=CHATGPT_PROMPT, message_capacity=20, model=CHATGPT_MODEL
        )
        self.chat = rtc.ChatManager(ctx.room)
        self.chat.on("message_received", self.on_chat_received)

    async def start(self):
        self.update_agent_state("listening")

    def on_chat_received(self, message: rtc.ChatMessage):
        if message.deleted:
            return

        self.update_agent_state("thinking")
        msg = ChatGPTMessage(role=ChatGPTMessageRole.user, content=message.message)
        chatgpt_result = self.chatgpt_plugin.add_message(msg)
        self.ctx.create_task(self.process_chatgpt_result(chatgpt_result))

    async def process_chatgpt_result(self, text_stream):
        self.update_agent_state("responding")

        first_message = True
        message: rtc.ChatMessage = None
        async for text in text_stream:
            if first_message:
                message = await self.chat.send_message(text)
                first_message = False
            else:
                message.message = message.message + text
                await self.chat.update_message(message)

        # buffer up the entire response from ChatGPT before sending a chat message
        self.update_agent_state("listening")

    def update_agent_state(self, state: str):
        metadata = json.dumps(
            {
                "agent_state": state,
            }
        )
        self.ctx.create_task(self.ctx.room.local_participant.update_metadata(metadata))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def job_request_cb(job_request: agents.JobRequest):
        await job_request.accept(
            TextStreamingAgent.create,
            identity="text-streaming-agent",
            name="Text Streaming Agent",
            # subscribe to all video tracks automatically
            auto_subscribe=None,
            # disconnect when the last participant leaves
            auto_disconnect=agents.AutoDisconnect.DEFAULT,
        )

    worker = agents.Worker(request_handler=job_request_cb)
    agents.run_app(worker)
