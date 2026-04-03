"""File model — tracks uploaded files stored in Cloudflare R2."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class File(BaseModel):
    __tablename__ = "files"
    __table_args__ = (
        Index("idx_file_user", "user_id"),
        Index("idx_file_entity", "entity_type", "entity_id"),
        Index("idx_file_category", "category"),
    )

    # Ownership
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )

    # File details
    filename: Mapped[str] = mapped_column(String(255))  # hashed/unique name in storage
    original_name: Mapped[str] = mapped_column(String(500))  # original upload name
    mime_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)  # bytes
    path: Mapped[str] = mapped_column(String(1000))  # R2 storage key
    url: Mapped[str | None] = mapped_column(String(2000))  # access URL (signed or CDN)

    # Categorization
    category: Mapped[str] = mapped_column(String(50))  # receipt_photo, bank_import, avatar, etc.
    entity_type: Mapped[str | None] = mapped_column(String(50))  # transaction, account, etc.
    entity_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True))

    # Metadata
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
