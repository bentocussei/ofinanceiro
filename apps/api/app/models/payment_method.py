"""Payment method model — stores user's saved payment methods across gateways."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import PaymentGatewayType, PaymentMethodType


class PaymentMethod(BaseModel):
    __tablename__ = "payment_methods"
    __table_args__ = (
        Index("idx_pm_user_active", "user_id", "is_active"),
        Index("idx_pm_user_default", "user_id", "is_default"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    gateway: Mapped[PaymentGatewayType] = mapped_column(
        ENUM(PaymentGatewayType, name="payment_gateway_type", create_type=True)
    )
    method_type: Mapped[PaymentMethodType] = mapped_column(
        ENUM(PaymentMethodType, name="payment_method_type", create_type=True)
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    label: Mapped[str] = mapped_column(
        String(100)
    )  # e.g. "Visa ***4242", "MCX 923***456"
    gateway_token: Mapped[str | None] = mapped_column(
        String(255)
    )  # Stripe PM id, MCX wallet ref, etc.
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, default=dict
    )  # card brand, last4, expiry, phone, etc.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
