"""FinanceSnapshot model — resumos periódicos da saúde financeira."""

import uuid

from sqlalchemy import ForeignKey, Integer, SmallInteger, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import SnapshotPeriodType


class FinanceSnapshot(BaseModel):
    __tablename__ = "finance_snapshots"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    period: Mapped[str] = mapped_column(String(7))  # formato "2026-03"
    period_type: Mapped[SnapshotPeriodType] = mapped_column(
        ENUM(SnapshotPeriodType, name="snapshot_period_type", create_type=True)
    )
    # Todos os valores em centavos
    total_income: Mapped[int] = mapped_column(Integer, default=0)
    total_expense: Mapped[int] = mapped_column(Integer, default=0)
    net_savings: Mapped[int] = mapped_column(Integer, default=0)
    total_balance: Mapped[int] = mapped_column(Integer, default=0)
    total_debt: Mapped[int] = mapped_column(Integer, default=0)
    total_savings: Mapped[int] = mapped_column(Integer, default=0)  # metas
    net_worth: Mapped[int] = mapped_column(Integer, default=0)
    expense_by_category: Mapped[dict] = mapped_column(JSONB, default=dict)
    income_by_source: Mapped[dict] = mapped_column(JSONB, default=dict)
    health_score: Mapped[int | None] = mapped_column(SmallInteger)  # 0-100

    __table_args__ = (
        UniqueConstraint("user_id", "period", "period_type", name="uq_snapshot_user_period"),
    )
