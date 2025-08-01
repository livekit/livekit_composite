import logging
import random
from enum import Enum
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel

from livekit.agents import (
    Agent,
    AgentSession,
    ChatContext,
    FunctionTool,
    JobContext,
    ModelSettings,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import openai, silero

logger = logging.getLogger("grok-agent")
logger.setLevel(logging.INFO)

load_dotenv()

## This example shows how to create tools dynamically
## There are 3 options:
## 1. Create tools when the agent is created
## 2. Update tools after the agent is created using agent.update_tools()
## 3. Add temporal tools only for this call of llm_node


class MyAgent(Agent):
    def __init__(self, instructions: str, tools: list[FunctionTool]) -> None:
        super().__init__(instructions=instructions, tools=tools)

    async def llm_node(
        self, chat_ctx: ChatContext, tools: list[FunctionTool], model_settings: ModelSettings
    ):
        # Option 3: add temporal tools only for this call of llm_node
        async def _get_weather(location: str) -> str:
            return f"The weather in {location} is sunny."

        # modify the tools list in place
        tools.append(
            function_tool(
                _get_weather,
                name="get_weather",
                description="Get the weather in a specific location",
            )
        )

        return Agent.default.llm_node(self, chat_ctx, tools, model_settings)


async def _get_course_list_from_db() -> list[str]:
    """
    This function simulates a database call but actually returns a hardcoded list.
    In a real application, you would replace this with logic to retrieve data
    from a real database or external data source.
    """
    return [
        "Applied mathematics",
        "Data Science",
        "Machine Learning",
        "Deep Learning",
        "Voice Agents",
    ]


async def entrypoint(ctx: JobContext):
    # Option 1: create tools when the agent is created
    courses = await _get_course_list_from_db()

    # enums will automatically be recognized by the LLMs
    CourseType = Enum("CourseType", {c.replace(" ", "_"): c for c in courses})

    class CourseInfo(BaseModel):
        course: CourseType  # type: ignore
        location: Literal["online", "in-person"]

    # BaseModel can also be created using create_model
    # https://docs.pydantic.dev/2.3/usage/models/#dynamic-model-creation

    async def _get_course_info(info: CourseInfo) -> str:
        logger.info(f"get_course_info called: {info}")
        return f"Imagine a course about {info.course}."

    agent = MyAgent(
        instructions="You are a helpful assistant that can answer questions and help with tasks.",
        tools=[
            function_tool(
                _get_course_info,
                name="get_course_info",
                description="Get information about a course",
            )
        ],
    )

    # Option 2: update tools after the agent is created using agent.update_tools()
    async def _random_number() -> int:
        num = random.randint(0, 100)
        logger.info(f"random_number called: {num}")
        return num

    await agent.update_tools(
        agent.tools
        + [function_tool(_random_number, name="random_number", description="Get a random number")]
    )

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=openai.STT(use_realtime=True),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(),
    )
    await session.start(agent, room=ctx.room)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
