"""Semantic memory: embeddings for conversation search using pgvector.

Uses the UserEmbedding SQLAlchemy model with native vector type.
Requires OpenAI API key for text-embedding-3-small.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user_embedding import EMBEDDING_DIMENSIONS, UserEmbedding

logger = logging.getLogger(__name__)


async def generate_embedding(text_content: str) -> list[float] | None:
    """Generate embedding vector for text using OpenAI."""
    if not settings.openai_api_key:
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
    """Store a text embedding in the database using the UserEmbedding model."""
    embedding = await generate_embedding(content)
    if embedding is None:
        return

    record = UserEmbedding(
        user_id=user_id,
        content=content,
        embedding=embedding,
        metadata_=metadata or {},
    )
    db.add(record)
    await db.flush()


async def search_similar(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    limit: int = 5,
    threshold: float = 0.7,
) -> list[dict]:
    """Search for similar content using cosine distance via pgvector."""
    query_embedding = await generate_embedding(query)
    if query_embedding is None:
        return []

    # Use pgvector's cosine distance operator (<=>)
    # Similarity = 1 - distance
    distance = UserEmbedding.embedding.cosine_distance(query_embedding)

    stmt = (
        select(
            UserEmbedding.content,
            UserEmbedding.metadata_,
            (1 - distance).label("similarity"),
        )
        .where(
            UserEmbedding.user_id == user_id,
            (1 - distance) > threshold,
        )
        .order_by(distance)
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()
    return [
        {"content": row.content, "metadata": row.metadata_, "similarity": float(row.similarity)}
        for row in rows
    ]
