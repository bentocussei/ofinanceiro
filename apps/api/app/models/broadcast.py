"""Broadcast model — SMS/email campaigns for user communication."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class BroadcastChannel(StrEnum):
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"


class BroadcastStatus(StrEnum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BroadcastAudience(StrEnum):
    ALL = "all"
    ACTIVE = "active"  # logged in last 30 days
    INACTIVE = "inactive"  # not logged in last 30 days
    TRIAL = "trial"  # on trial period
    PAID = "paid"  # paying subscribers
    CUSTOM = "custom"  # specific user_ids in metadata


class Broadcast(BaseModel):
    """A broadcast message (SMS, email, or push) to a group of users."""
    __tablename__ = "broadcasts"

    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(
        String(10)
    )
    audience: Mapped[str] = mapped_column(
        String(20)
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default=BroadcastStatus.DRAFT,
    )
    # Scheduling
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Stats
    total_recipients: Mapped[int] = mapped_column(Integer, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    # Extra data: custom user_ids, template vars, etc.
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")
    # Who created this broadcast (admin)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class BroadcastRecipient(BaseModel):
    """Individual delivery tracking for each recipient of a broadcast."""
    __tablename__ = "broadcast_recipients"

    broadcast_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("broadcasts.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
