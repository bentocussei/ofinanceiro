"""Semantic memory: embeddings for conversation search using pgvector.

Note: Requires OpenAI API key for text-embedding-3-small.
In dev without API key, embedding operations are skipped gracefully.
"""

import logging
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS = 1536  # text-embedding-3-small


async def generate_embedding(text_content: str) -> list[float] | None:
    """Generate embedding vector for text using OpenAI.
    Returns None if API key not configured.
    """
    if not settings.openai_api_key:
        logger.debug("OpenAI API key not configured, skipping embedding generation")
        return None

    try:
        import openai

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text_content,
        )
        return response.data[0].embedding
    except Exception:
        logger.exception("Failed to generate embedding")
        return None


async def store_embedding(
    db: AsyncSession,
    user_id: uuid.UUID,
    content: str,
    metadata: dict | None = None,
) -> None:
    """Store a text embedding in the database.
    Requires pgvector extension and user_embeddings table.
    """
    embedding = await generate_embedding(content)
    if embedding is None:
        return

    try:
        await db.execute(
            text("""
                INSERT INTO user_embeddings (id, user_id, content, embedding, metadata)
                VALUES (gen_random_uuid(), :user_id, :content, :embedding, :metadata)
            """),
            {
                "user_id": str(user_id),
                "content": content,
                "embedding": str(embedding),
                "metadata": str(metadata or {}),
            },
        )
        await db.flush()
    except Exception:
        logger.debug("user_embeddings table may not exist yet — skipping storage")


async def search_similar(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    limit: int = 5,
    threshold: float = 0.7,
) -> list[dict]:
    """Search for similar content using cosine similarity.
    Returns empty list if embeddings not available.
    """
    query_embedding = await generate_embedding(query)
    if query_embedding is None:
        return []

    try:
        result = await db.execute(
            text("""
                SELECT content, metadata, 1 - (embedding <=> :query_embedding) as similarity
                FROM user_embeddings
                WHERE user_id = :user_id
                AND 1 - (embedding <=> :query_embedding) > :threshold
                ORDER BY embedding <=> :query_embedding
                LIMIT :limit
            """),
            {
                "user_id": str(user_id),
                "query_embedding": str(query_embedding),
                "threshold": threshold,
                "limit": limit,
            },
        )
        rows = result.all()
        return [
            {"content": row.content, "metadata": row.metadata, "similarity": row.similarity}
            for row in rows
        ]
    except Exception:
        logger.debug("Semantic search failed — table may not exist")
        return []
