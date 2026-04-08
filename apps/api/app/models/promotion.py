"""Promotion and promotion usage models for billing discounts."""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import PromotionType


class Promotion(BaseModel):
    __tablename__ = "promotions"

    name: Mapped[str] = mapped_column(String(100))
    code: Mapped[str | None] = mapped_column(
        String(50), unique=True
    )  # null = auto-applied
    type: Mapped[PromotionType] = mapped_column(
        ENUM(PromotionType, name="promotion_type", create_type=True)
    )
    value: Mapped[int] = mapped_column(
        Integer
    )  # percentage (0-100) or centavos or days
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )  # null = permanent
    apply_to_all: Mapped[bool] = mapped_column(Boolean, default=True)
    applicable_plan_types: Mapped[list[str]] = mapped_column(
        ARRAY(String), default=list
    )
    max_beneficiaries: Mapped[int | None] = mapped_column(
        Integer
    )  # null = unlimited
    current_usage_count: Mapped[int] = mapped_column(Integer, default=0)
    auto_apply_on_register: Mapped[bool] = mapped_column(Boolean, default=False)
    free_days: Mapped[int] = mapped_column(Integer, default=0)  # for free_days type
    priority: Mapped[int] = mapped_column(
        SmallInteger, default=0
    )  # lower number = higher priority
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class PromotionUsage(BaseModel):
    __tablename__ = "promotion_usages"
    __table_args__ = (
        UniqueConstraint("promotion_id", "user_id", name="uq_promotion_user"),
    )

    promotion_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("promotions.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("user_subscriptions.id", ondelete="SET NULL"),
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    discount_amount: Mapped[int] = mapped_column(BigInteger, default=0)  # centavos
