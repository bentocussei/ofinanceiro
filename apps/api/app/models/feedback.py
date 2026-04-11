"""Feedback model — ratings, suggestions, complaints from users or anonymous visitors."""

import uuid
from enum import StrEnum

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class FeedbackType(StrEnum):
    RATING = "rating"
    SUGGESTION = "suggestion"
    COMPLAINT = "complaint"
    BUG_REPORT = "bug_report"


class Feedback(BaseModel):
    __tablename__ = "feedbacks"

    # Nullable — anonymous feedback from landing page has no user
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(String(20))  # FeedbackType values
    # 1-5 stars (only for type=rating, nullable for others)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # For anonymous users — optional contact info
    contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Context
    page_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Admin tracking
    is_resolved: Mapped[bool] = mapped_column(default=False)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
