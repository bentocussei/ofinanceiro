"""User embedding model — semantic memory for conversation search via pgvector."""

import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel

EMBEDDING_DIMENSIONS = 1536  # text-embedding-3-small


class UserEmbedding(BaseModel):
    __tablename__ = "user_embeddings"
    __table_args__ = (
        Index("idx_user_embeddings_user", "user_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(Vector(EMBEDDING_DIMENSIONS))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
