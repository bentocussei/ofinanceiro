"""ExpenseSplit and ExpenseSplitPart models."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import SplitType


class ExpenseSplit(BaseModel):
    __tablename__ = "expense_splits"

    family_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), index=True
    )
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Total em centavos
    total_amount: Mapped[int] = mapped_column(BigInteger)
    split_type: Mapped[SplitType] = mapped_column(
        ENUM(SplitType, name="split_type", create_type=True),
        default=SplitType.EQUAL,
    )
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    parts: Mapped[list["ExpenseSplitPart"]] = relationship(
        back_populates="split", lazy="subquery", cascade="all, delete-orphan"
    )


class ExpenseSplitPart(BaseModel):
    __tablename__ = "expense_split_parts"

    split_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("expense_splits.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("family_members.id", ondelete="CASCADE"), index=True
    )
    # Valor em centavos
    amount: Mapped[int] = mapped_column(BigInteger)
    # Para tipo PERCENTAGE: em basis points (ex: 5000 = 50.00%)
    percentage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    split: Mapped["ExpenseSplit"] = relationship(back_populates="parts")
