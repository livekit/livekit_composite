import asyncio
import pickle
import uuid
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union
import aiohttp
from tqdm import tqdm

from livekit.agents import tokenize
from livekit.plugins import openai, rag

logger = logging.getLogger("rag-builder")

class RAGBuilder:
    """
    Builder for creating and managing RAG (Retrieval-Augmented Generation) databases.
    Handles data preparation, embedding generation, and vector database creation.
    
    Example usage:
        builder = RAGBuilder(
            index_path="vdb_data",
            data_path="my_data.pkl",
            embeddings_dimension=1536
        )
        
        # Build from raw text file
        await builder.build_from_file("raw_data.txt")
        
        # Or build from list of texts
        await builder.build_from_texts([
            "First paragraph of content",
            "Second paragraph of content",
            ...
        ])
    """
    
    def __init__(
        self,
        index_path: Union[str, Path],
        data_path: Union[str, Path],
        embeddings_dimension: int = 1536,
        embeddings_model: str = "text-embedding-3-small",
        metric: str = "angular"
    ):
        """
        Initialize the RAG builder.
        
        Args:
            index_path: Path where the Annoy index will be saved
            data_path: Path where the paragraph data will be saved
            embeddings_dimension: Dimension of embeddings to use
            embeddings_model: OpenAI model to use for embeddings
            metric: Distance metric for Annoy index ("angular", "euclidean", or "manhattan")
        """
        self._index_path = Path(index_path)
        self._data_path = Path(data_path)
        self._embeddings_dimension = embeddings_dimension
        self._embeddings_model = embeddings_model
        self._metric = metric
        
    async def _create_embeddings(
        self,
        text: str,
        http_session: aiohttp.ClientSession
    ) -> openai.EmbeddingData:
        """Create embeddings for a single text."""
        results = await openai.create_embeddings(
            input=[text],
            model=self._embeddings_model,
            dimensions=self._embeddings_dimension,
            http_session=http_session
        )
        return results[0]
    
    async def build_from_texts(
        self,
        texts: List[str],
        show_progress: bool = True
    ) -> None:
        """
        Build the RAG database from a list of texts.
        Each text will be treated as a separate paragraph/document.
        
        Args:
            texts: List of text strings to process
            show_progress: Whether to show a progress bar
        """
        # Create parent directories if they don't exist
        self._index_path.parent.mkdir(parents=True, exist_ok=True)
        self._data_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiohttp.ClientSession() as http_session:
            idx_builder = rag.annoy.IndexBuilder(
                f=self._embeddings_dimension,
                metric=self._metric
            )
            
            # Generate UUIDs for each paragraph
            paragraphs_by_uuid = {
                uuid.uuid4(): text
                for text in texts
            }
            
            # Create iterator with optional progress bar
            items = paragraphs_by_uuid.items()
            if show_progress:
                items = tqdm(items, desc="Creating embeddings")
            
            # Generate embeddings and add to index
            for p_uuid, paragraph in items:
                resp = await self._create_embeddings(paragraph, http_session)
                idx_builder.add_item(resp.embedding, p_uuid)
            
            # Build and save the index
            logger.info(f"Building index at {self._index_path}")
            idx_builder.build()
            idx_builder.save(str(self._index_path))
            
            # Save paragraph data
            logger.info(f"Saving paragraph data to {self._data_path}")
            with open(self._data_path, "wb") as f:
                pickle.dump(paragraphs_by_uuid, f)
    
    async def build_from_file(
        self,
        file_path: Union[str, Path],
        show_progress: bool = True
    ) -> None:
        """
        Build the RAG database from a text file.
        The file will be split into paragraphs using basic tokenization.
        
        Args:
            file_path: Path to the text file to process
            show_progress: Whether to show a progress bar
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Input file not found: {file_path}")
        
        # Read and tokenize the file
        with open(file_path, "r") as f:
            raw_data = f.read()
        
        paragraphs = tokenize.basic.tokenize_paragraphs(raw_data)
        await self.build_from_texts(paragraphs, show_progress)
    
    @classmethod
    async def create_from_file(
        cls,
        file_path: Union[str, Path],
        index_path: Union[str, Path],
        data_path: Union[str, Path],
        **kwargs
    ) -> "RAGBuilder":
        """
        Convenience method to create and build a RAG database in one step.
        
        Args:
            file_path: Path to the input text file
            index_path: Path where the Annoy index will be saved
            data_path: Path where the paragraph data will be saved
            **kwargs: Additional arguments to pass to RAGBuilder constructor
        
        Returns:
            The constructed RAGBuilder instance
        """
        builder = cls(index_path, data_path, **kwargs)
        await builder.build_from_file(file_path)
        return builder 