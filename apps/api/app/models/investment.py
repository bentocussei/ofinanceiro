"""Investment model."""

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import CurrencyCode


class Investment(BaseModel):
    __tablename__ = "investments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))  # deposit, bond, stock, crypto, real_estate
    institution: Mapped[str | None] = mapped_column(String(100))
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    invested_amount: Mapped[int] = mapped_column(Integer)  # centavos
    current_value: Mapped[int] = mapped_column(Integer)  # centavos
    interest_rate: Mapped[int | None] = mapped_column(Integer)  # basis points
    start_date: Mapped[date | None] = mapped_column(Date)
    maturity_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index("idx_investments_user_active", "user_id", "is_active"),
    )
