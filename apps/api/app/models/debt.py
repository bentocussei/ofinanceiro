"""Debt and DebtPayment models."""

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
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import CreditorType, CurrencyCode, DebtNature, DebtType


class Debt(BaseModel):
    __tablename__ = "debts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[DebtType] = mapped_column(
        ENUM(DebtType, name="debt_type", create_type=True)
    )
    creditor: Mapped[str | None] = mapped_column(String(200))
    original_amount: Mapped[int] = mapped_column(BigInteger)  # centavos
    current_balance: Mapped[int] = mapped_column(BigInteger)  # centavos
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    interest_rate: Mapped[int | None] = mapped_column(Integer)  # basis points (e.g., 1200 = 12.00%)
    monthly_payment: Mapped[int | None] = mapped_column(BigInteger)  # centavos
    payment_day: Mapped[int | None] = mapped_column(SmallInteger)
    start_date: Mapped[date | None] = mapped_column(Date)
    expected_end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    nature: Mapped[DebtNature] = mapped_column(
        ENUM(DebtNature, name="debt_nature", create_type=True),
        default=DebtNature.FORMAL,
    )
    creditor_type: Mapped[CreditorType | None] = mapped_column(
        ENUM(CreditorType, name="creditor_type", create_type=True), nullable=True
    )
    linked_account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )  # para pagamento automático
    auto_pay_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_paid_off: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_off_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    payments: Mapped[list["DebtPayment"]] = relationship(
        back_populates="debt", lazy="subquery", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_debts_user_active", "user_id", "is_active"),
    )


class DebtPayment(BaseModel):
    __tablename__ = "debt_payments"

    debt_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("debts.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[int] = mapped_column(BigInteger)  # centavos
    principal: Mapped[int | None] = mapped_column(BigInteger)
    interest: Mapped[int | None] = mapped_column(Integer)
    payment_date: Mapped[date] = mapped_column(Date)
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("transactions.id")
    )

    debt: Mapped["Debt"] = relationship(back_populates="payments")
