"""Subscription models for billing."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import (
    BillingCycle,
    PaymentGatewayType,
    SubscriptionPlan,
    SubscriptionStatus,
)


# Legacy model — kept for backward compatibility with existing code
class Subscription(BaseModel):
    __tablename__ = "subscriptions_legacy"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    plan: Mapped[SubscriptionPlan] = mapped_column(
        ENUM(SubscriptionPlan, name="subscription_plan", create_type=True)
    )
    status: Mapped[str] = mapped_column(String(20), default="active")
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100))
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100))
    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    cancel_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserSubscription(BaseModel):
    __tablename__ = "user_subscriptions"
    __table_args__ = (
        Index("idx_user_sub_user_status", "user_id", "status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("plans.id", ondelete="SET NULL")
    )
    plan_snapshot: Mapped[dict] = mapped_column(
        JSONB, default=dict
    )  # full plan copy at subscription time
    billing_cycle: Mapped[BillingCycle] = mapped_column(
        ENUM(BillingCycle, name="billing_cycle", create_type=True)
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        ENUM(SubscriptionStatus, name="subscription_status", create_type=True),
        default=SubscriptionStatus.ACTIVE,
    )

    # Pricing (all in centavos)
    base_price: Mapped[int] = mapped_column(Integer)
    discount_amount: Mapped[int] = mapped_column(Integer, default=0)
    extra_members_count: Mapped[int] = mapped_column(SmallInteger, default=0)
    extra_members_cost: Mapped[int] = mapped_column(Integer, default=0)
    module_addons_cost: Mapped[int] = mapped_column(Integer, default=0)
    final_price: Mapped[int] = mapped_column(Integer)  # what user actually pays

    # Promotion
    promotion_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="SET NULL")
    )

    # Dates
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    trial_end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Renewal
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)

    # Payment gateway
    payment_gateway: Mapped[PaymentGatewayType | None] = mapped_column(
        ENUM(PaymentGatewayType, name="payment_gateway_type", create_type=True)
    )
    default_payment_method_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("payment_methods.id", ondelete="SET NULL")
    )

    # Scheduled plan change (pending downgrade or cycle change)
    pending_plan_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("plans.id", ondelete="SET NULL")
    )
    pending_billing_cycle: Mapped[BillingCycle | None] = mapped_column(
        ENUM(BillingCycle, name="billing_cycle", create_type=False), nullable=True
    )
    pending_change_scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    proration_credit: Mapped[int] = mapped_column(Integer, default=0)  # centavos credited

    # Stripe (legacy — kept for backward compatibility, use payment_methods table)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100))

    # Relationships
    addons: Mapped[list["SubscriptionAddon"]] = relationship(
        back_populates="subscription", lazy="noload"
    )


class SubscriptionAddon(BaseModel):
    __tablename__ = "subscription_addons"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("user_subscriptions.id", ondelete="CASCADE"),
        index=True,
    )
    module_addon_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("module_addons.id", ondelete="CASCADE"),
        index=True,
    )
    addon_snapshot: Mapped[dict] = mapped_column(
        JSONB, default=dict
    )  # snapshot at purchase time
    price: Mapped[int] = mapped_column(Integer)  # centavos
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    subscription: Mapped["UserSubscription"] = relationship(
        back_populates="addons", lazy="noload"
    )
