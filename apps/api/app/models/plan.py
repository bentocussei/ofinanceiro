"""Plan model for billing tiers."""

from sqlalchemy import Boolean, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import CurrencyCode, PlanType


class Plan(BaseModel):
    __tablename__ = "plans"

    type: Mapped[PlanType] = mapped_column(
        ENUM(PlanType, name="plan_type", create_type=True)
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    base_price_monthly: Mapped[int] = mapped_column(Integer)  # centavos AOA
    base_price_annual: Mapped[int] = mapped_column(Integer)  # centavos AOA
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    max_family_members: Mapped[int] = mapped_column(
        SmallInteger, default=0
    )  # 0 for pessoal
    extra_member_cost: Mapped[int] = mapped_column(
        Integer, default=0
    )  # centavos per extra member/month
    features: Mapped[dict] = mapped_column(JSONB, default=dict)
    gateway_metadata: Mapped[dict] = mapped_column(
        JSONB, default=dict
    )  # {"stripe": {"product_id": "...", "price_monthly_id": "...", "price_annual_id": "..."}}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)
