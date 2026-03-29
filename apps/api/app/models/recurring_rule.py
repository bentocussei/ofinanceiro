"""RecurringRule model — regras de transacções recorrentes."""

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Index, Integer, SmallInteger, String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import RecurrenceFrequency, TransactionType


class RecurringRule(BaseModel):
    __tablename__ = "recurring_rules"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE")
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[TransactionType] = mapped_column(
        ENUM(TransactionType, name="transaction_type", create_type=True)
    )
    # Valor em centavos
    amount: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(String(200))
    frequency: Mapped[RecurrenceFrequency] = mapped_column(
        ENUM(RecurrenceFrequency, name="recurrence_frequency", create_type=True)
    )
    day_of_month: Mapped[int | None] = mapped_column(SmallInteger)
    day_of_week: Mapped[int | None] = mapped_column(SmallInteger)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_processed: Mapped[date | None] = mapped_column(Date)
    next_due: Mapped[date | None] = mapped_column(Date)

    __table_args__ = (
        Index("idx_recurring_rules_user_active", "user_id", "is_active"),
    )
