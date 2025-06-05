import asyncio
from pathlib import Path
from dotenv import load_dotenv
from agent_extensions.rag import RAGBuilder

load_dotenv()

async def main() -> None:
    # Create and build the RAG database from the raw data file
    await RAGBuilder.create_from_file(
        file_path="raw_data.txt",
        index_path="vdb_data",
        data_path="my_data.pkl",
        embeddings_dimension=1536  # Optional, this is the default
    )

if __name__ == "__main__":
    asyncio.run(main()) 