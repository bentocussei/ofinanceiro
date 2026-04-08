"""IncomeSource model — fontes de rendimento do utilizador."""

import uuid

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import CurrencyCode, IncomeSourceType, RecurrenceFrequency


class IncomeSource(BaseModel):
    __tablename__ = "income_sources"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100))  # "Salário Empresa X"
    type: Mapped[IncomeSourceType] = mapped_column(
        ENUM(IncomeSourceType, name="income_source_type", create_type=True)
    )
    description: Mapped[str | None] = mapped_column(Text)
    # Valor esperado em centavos
    expected_amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    frequency: Mapped[RecurrenceFrequency] = mapped_column(
        ENUM(RecurrenceFrequency, name="recurrence_frequency", create_type=True),
        default=RecurrenceFrequency.MONTHLY,
    )
    day_of_month: Mapped[int | None] = mapped_column(SmallInteger)  # dia que cai
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )  # conta destino
    icon: Mapped[str | None] = mapped_column(String(10))
    color: Mapped[str | None] = mapped_column(String(7))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
