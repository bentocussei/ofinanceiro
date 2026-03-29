"""Goal and GoalContribution models."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import CurrencyCode, GoalStatus, RecurrenceFrequency


class Goal(BaseModel):
    __tablename__ = "goals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50), default="savings")
    icon: Mapped[str | None] = mapped_column(String(10))
    color: Mapped[str | None] = mapped_column(String(7))
    # Amounts in centavos
    target_amount: Mapped[int] = mapped_column(Integer)
    current_amount: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    target_date: Mapped[date | None] = mapped_column(Date)
    contribution_amount: Mapped[int | None] = mapped_column(Integer)
    contribution_frequency: Mapped["RecurrenceFrequency"] = mapped_column(
        ENUM(RecurrenceFrequency, name="recurrence_frequency", create_type=True),
        default=RecurrenceFrequency.MONTHLY,
    )
    auto_contribute: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_contribute_day: Mapped[int | None] = mapped_column(SmallInteger)
    status: Mapped[GoalStatus] = mapped_column(
        ENUM(GoalStatus, name="goal_status", create_type=True),
        default=GoalStatus.ACTIVE,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    savings_account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)

    contributions: Mapped[list["GoalContribution"]] = relationship(
        back_populates="goal", lazy="subquery", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_goals_user_status", "user_id", "status"),
    )


class GoalContribution(BaseModel):
    __tablename__ = "goal_contributions"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    amount: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(Text)
    contributed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    goal: Mapped["Goal"] = relationship(back_populates="contributions")
