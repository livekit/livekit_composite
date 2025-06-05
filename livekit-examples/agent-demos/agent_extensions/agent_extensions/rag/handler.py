import logging
import pickle
import asyncio
import random
from enum import Enum
from pathlib import Path
from typing import List, Optional, Union, Annotated
from livekit.agents import llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, rag
from ..utils import WavPlayer

logger = logging.getLogger("rag-handler")

class ThinkingStyle(Enum):
    NONE = "none"
    MESSAGE = "message"
    LLM = "llm"
    AUDIO = "audio"

DEFAULT_THINKING_MESSAGES = [
    "Let me look that up...",
    "One moment while I check...",
    "I'll find that information for you...",
    "Just a second while I search...",
    "Looking into that now..."
]

DEFAULT_THINKING_PROMPT = "Generate a very short message to indicate that we're looking up the answer in the docs"

class RAGHandler:
    """
    Handler for Retrieval-Augmented Generation (RAG) in LiveKit agents.
    Provides flexible ways to handle delays during RAG lookups.
    
    Example usage:
        rag_handler = RAGHandler(
            index_path="vdb_data",
            data_path="my_data.pkl",
            thinking_style="message"
        )
        agent = VoicePipelineAgent(...)
        rag_handler.start(agent)
    """
    
    def __init__(
        self,
        index_path: Union[str, Path],
        data_path: Union[str, Path],
        thinking_style: Union[str, ThinkingStyle] = ThinkingStyle.MESSAGE,
        thinking_messages: Optional[List[str]] = None,
        thinking_audio_path: Optional[Union[str, Path]] = None,
        thinking_prompt: Optional[str] = None,
        embeddings_dimension: int = 1536,
        embeddings_model: str = "text-embedding-3-small"
    ):
        """
        Initialize the RAG handler.
        
        Args:
            index_path: Path to the Annoy index file
            data_path: Path to the pickled data file containing paragraphs
            thinking_style: How to handle delays during RAG lookups
            thinking_messages: Custom messages to use with MESSAGE style
            thinking_audio_path: Path to audio file to use with AUDIO style
            thinking_prompt: Custom prompt to use with LLM style
            embeddings_dimension: Dimension of embeddings to use
            embeddings_model: OpenAI model to use for embeddings
        """
        self._index_path = Path(index_path)
        self._data_path = Path(data_path)
        self._thinking_style = thinking_style if isinstance(thinking_style, ThinkingStyle) else ThinkingStyle(thinking_style)
        self._thinking_messages = thinking_messages or DEFAULT_THINKING_MESSAGES
        self._thinking_audio_path = Path(thinking_audio_path) if thinking_audio_path else None
        self._thinking_prompt = thinking_prompt or DEFAULT_THINKING_PROMPT
        self._embeddings_dimension = embeddings_dimension
        self._embeddings_model = embeddings_model
        self._chat_ctx_lock = asyncio.Lock()
        self._wav_player = WavPlayer() if self._thinking_style == ThinkingStyle.AUDIO else None
        
        # Load index and data
        if not self._index_path.exists():
            raise FileNotFoundError(f"Annoy index not found at {self._index_path}")
        if not self._data_path.exists():
            raise FileNotFoundError(f"Data file not found at {self._data_path}")
            
        self._annoy_index = rag.annoy.AnnoyIndex.load(self._index_path)
        with open(self._data_path, "rb") as f:
            self._paragraphs_by_uuid = pickle.load(f)
    
    async def _handle_thinking(self, agent: VoicePipelineAgent) -> None:
        """Handle the thinking phase based on the configured style."""
        if self._thinking_style == ThinkingStyle.NONE:
            return
            
        elif self._thinking_style == ThinkingStyle.MESSAGE:
            await agent.say(random.choice(self._thinking_messages))
            
        elif self._thinking_style == ThinkingStyle.LLM:
            async with self._chat_ctx_lock:
                thinking_ctx = llm.ChatContext().append(
                    role="system",
                    text=self._thinking_prompt
                )
                thinking_stream = agent._llm.chat(chat_ctx=thinking_ctx)
                await agent.say(thinking_stream, add_to_chat_ctx=False)
                
        elif self._thinking_style == ThinkingStyle.AUDIO and self._thinking_audio_path:
            await self._wav_player.play_once(self._thinking_audio_path, agent._room)
    
    async def _enrich_with_rag(self, agent: VoicePipelineAgent, chat_ctx: llm.ChatContext) -> None:
        """
        Core RAG functionality to enrich the context with relevant information.
        """
        async with self._chat_ctx_lock:
            user_msg = chat_ctx.messages[-1]

        user_embedding = await openai.create_embeddings(
            input=[user_msg.content],
            model=self._embeddings_model,
            dimensions=self._embeddings_dimension,
        )

        result = self._annoy_index.query(user_embedding[0].embedding, n=1)[0]
        paragraph = self._paragraphs_by_uuid[result.userdata]

        if paragraph:
            logger.info(f"enriching with RAG: {paragraph}")
            rag_msg = llm.ChatMessage.create(
                text="Context:\n" + paragraph,
                role="assistant",
            )
            
            async with self._chat_ctx_lock:
                # Replace last message with RAG, then append user message at the end
                chat_ctx.messages[-1] = rag_msg
                chat_ctx.messages.append(user_msg)

                # Generate a response using the enriched context
                llm_stream = agent._llm.chat(chat_ctx=chat_ctx)
                await agent.say(llm_stream)
    
    def start(self, agent: VoicePipelineAgent) -> None:
        """
        Start the RAG handler with the given agent.
        Sets up the RAG function in the agent's function context.
        
        Args:
            agent: The VoicePipelineAgent to attach this handler to
        """
        @agent.fnc_ctx.ai_callable()
        async def enrich_with_rag(
            code: Annotated[
                int, llm.TypeInfo(description="Enrich with RAG for questions about LiveKit.")
            ]
        ):
            """
            Called when you need to enrich with RAG for questions about LiveKit.
            """
            logger.info("Enriching with RAG for questions about LiveKit")
            
            await self._handle_thinking(agent)
            await self._enrich_with_rag(agent, agent.chat_ctx) 