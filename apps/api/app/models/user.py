import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import CurrencyCode, SubscriptionPlan


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(Text)

    currency_default: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    country: Mapped[str] = mapped_column(String(2), default="AO")
    language: Mapped[str] = mapped_column(String(5), default="pt-AO")

    plan: Mapped[SubscriptionPlan] = mapped_column(
        ENUM(SubscriptionPlan, name="subscription_plan", create_type=True),
        default=SubscriptionPlan.FREE,
    )
    plan_expires_at: Mapped[datetime | None] = mapped_column()

    salary_day: Mapped[int | None] = mapped_column(SmallInteger)
    month_start_day: Mapped[int] = mapped_column(SmallInteger, default=1)

    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column()

    # Referral system
    referral_code: Mapped[str | None] = mapped_column(
        String(20), unique=True, index=True
    )
    referred_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    accounts: Mapped[list["Account"]] = relationship(  # noqa: F821
        back_populates="user", lazy="noload"
    )
    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        back_populates="user", foreign_keys="[Transaction.user_id]", lazy="noload"
    )
