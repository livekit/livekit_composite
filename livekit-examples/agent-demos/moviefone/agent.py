from __future__ import annotations
from typing import Annotated, List

import logging
from dotenv import load_dotenv
from pathlib import Path
import json
from movie_api import MovieAPI

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.multimodal import MultimodalAgent
from livekit.plugins import openai
import asyncio
import aiohttp
from datetime import datetime, date

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

logger = logging.getLogger("my-worker")
logger.setLevel(logging.INFO)


async def entrypoint(ctx: JobContext):
    fnc_ctx = llm.FunctionContext()
    movie_api = MovieAPI()

    @fnc_ctx.ai_callable()
    async def get_movies(
        location: Annotated[
            str, llm.TypeInfo(description="The city to get movie showtimes for")
        ],
        province: Annotated[
            str, llm.TypeInfo(description="The province/state code (e.g. 'qc' for Quebec, 'on' for Ontario)")
        ],
        show_date: Annotated[
            str, llm.TypeInfo(description="The date to get showtimes for in YYYY-MM-DD format. If not provided, defaults to today.")
        ] = None,
    ):
        """Called when the user asks about movies showing in theaters. Returns the movies showing in the specified location for the given date."""
        logger.info(f"get_movies called with location='{location}', province='{province}', date='{show_date}'")
        try:
            target_date = datetime.strptime(show_date, "%Y-%m-%d") if show_date else datetime.now()
            theatre_movies = await movie_api.get_movies(location, province, target_date)
            num_theatres = len(theatre_movies.theatres)
            logger.info(f"Returning movies for {num_theatres} theatres in '{location}', '{province}'.")

            if num_theatres == 0:
                return f"No movies found for {location}, {province}."

            output = []
            for theatre in theatre_movies.theatres:
                output.append(f"\n{theatre['theatre_name']}")
                output.append("-------------------")
                
                for movie in theatre["movies"]:
                    showtimes = ", ".join([
                        f"{showtime.start_time.strftime('%I:%M %p').lstrip('0')}" + 
                        (" (Sold Out)" if showtime.is_sold_out else f" ({showtime.seats_remaining} seats)")
                        for showtime in movie.showtimes
                    ])
                    
                    output.append(f"• {movie.title}")
                    output.append(f"  Genre: {movie.genre}")
                    output.append(f"  Rating: {movie.rating}")
                    output.append(f"  Runtime: {movie.runtime} mins")
                    output.append(f"  Showtimes: {showtimes}")
                    output.append("")
                
                output.append("-------------------\n")

            return "\n".join(output)
        except Exception as e:
            logger.error(f"Error in get_movies: {e}")
            return f"Sorry, I couldn't get the movie listings for {location}. Please check the city and province/state names and try again."

    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    participant = await ctx.wait_for_participant()

    run_multimodal_agent(ctx, participant, fnc_ctx)

    logger.info("agent started")


def run_multimodal_agent(ctx: JobContext, participant: rtc.Participant, fnc_ctx: llm.FunctionContext):
    logger.info("starting multimodal agent")
    
    today = datetime.now()
    
    model = openai.realtime.RealtimeModel(
        instructions=(
            "You are an assistant who helps users find movies showing in Canada. "
            f"Today's date is {today.strftime('%Y-%m-%d')}. "
            "You can help users find movies for specific dates - if they use relative terms like 'tomorrow' or "
            "'next Friday', convert those to YYYY-MM-DD format based on today's date. Don't check anything "
            "unless the user asks. Only give the minimum information needed to answer the question the user asks."
        ),
        modalities=["audio", "text"],
    )
    assistant = MultimodalAgent(model=model, fnc_ctx=fnc_ctx)
    assistant.start(ctx.room, participant)

    session = model.sessions[0]
    session.conversation.item.create(
        llm.ChatMessage(
            role="assistant",
            content=(
                f"Greet the user, and ask them which movie they'd like to see, and which city and province they're in."
            ),
        )
    )
    session.response.create()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )