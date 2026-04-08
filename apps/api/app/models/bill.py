"""Bill model — contas recorrentes a pagar."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import BillStatus, CurrencyCode, RecurrenceFrequency


class Bill(BaseModel):
    __tablename__ = "bills"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100))  # "Electricidade ENDE"
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    # Valor esperado em centavos
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    due_day: Mapped[int] = mapped_column(SmallInteger)  # dia do mês
    frequency: Mapped[RecurrenceFrequency] = mapped_column(
        ENUM(RecurrenceFrequency, name="recurrence_frequency", create_type=True),
        default=RecurrenceFrequency.MONTHLY,
    )
    pay_from_account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    auto_pay: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_pay_days_before: Mapped[int] = mapped_column(SmallInteger, default=0)
    # Lembrar X dias antes
    reminder_days: Mapped[list[int]] = mapped_column(
        ARRAY(SmallInteger), default=lambda: [3, 1]
    )
    status: Mapped[BillStatus] = mapped_column(
        ENUM(BillStatus, name="bill_status", create_type=True),
        default=BillStatus.PENDING,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_due_date: Mapped[date | None] = mapped_column(Date)
    vendor_ref: Mapped[str | None] = mapped_column(String(100))
    icon: Mapped[str | None] = mapped_column(String(10))
    color: Mapped[str | None] = mapped_column(String(7))

    __table_args__ = (
        Index("idx_bills_user_active", "user_id", "is_active"),
    )
