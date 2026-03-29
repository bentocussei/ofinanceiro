"""FinanceSettings model — preferências financeiras do utilizador."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, SmallInteger, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import CurrencyCode


class FinanceSettings(BaseModel):
    __tablename__ = "finance_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    default_currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    month_start_day: Mapped[int] = mapped_column(SmallInteger, default=1)
    budget_alert_threshold: Mapped[int] = mapped_column(SmallInteger, default=80)  # percentagem
    low_balance_threshold: Mapped[int] = mapped_column(Integer, default=0)  # centavos
    bill_reminder_days: Mapped[list[int]] = mapped_column(
        ARRAY(SmallInteger), default=lambda: [7, 3, 1]
    )
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    push_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_report: Mapped[bool] = mapped_column(Boolean, default=False)
    monthly_report: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_finance_settings_user"),
    )
