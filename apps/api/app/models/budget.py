"""Budget and BudgetItem models."""

import uuid
from datetime import date

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import BudgetMethod, BudgetPeriod


class Budget(BaseModel):
    __tablename__ = "budgets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # family_id FK added in Phase 4
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    name: Mapped[str | None] = mapped_column(String(100))
    method: Mapped[BudgetMethod] = mapped_column(
        ENUM(BudgetMethod, name="budget_method", create_type=True),
        default=BudgetMethod.CATEGORY,
    )
    period_type: Mapped[BudgetPeriod] = mapped_column(
        ENUM(BudgetPeriod, name="budget_period", create_type=True),
        default=BudgetPeriod.MONTHLY,
    )
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    # Total limit in centavos (for flex/50-30-20 methods)
    total_limit: Mapped[int | None] = mapped_column(BigInteger)
    rollover: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_threshold: Mapped[int] = mapped_column(SmallInteger, default=80)  # percentagem
    alert_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    items: Mapped[list["BudgetItem"]] = relationship(
        back_populates="budget", lazy="subquery", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_budgets_user_active", "user_id", "is_active"),
    )


class BudgetItem(BaseModel):
    __tablename__ = "budget_items"

    budget_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("budgets.id", ondelete="CASCADE"), index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE")
    )
    # Limit in centavos
    limit_amount: Mapped[int] = mapped_column(BigInteger)
    # Rollover from previous period in centavos
    rollover_amount: Mapped[int] = mapped_column(BigInteger, default=0)

    # Relationships
    budget: Mapped["Budget"] = relationship(back_populates="items")
    category: Mapped["Category"] = relationship(lazy="joined")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("budget_id", "category_id", name="uq_budget_item_category"),
    )
