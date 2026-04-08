"""Payment model — transaction ledger for all payments across gateways."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import (
    CurrencyCode,
    PaymentGatewayType,
    PaymentStatus,
    PaymentType,
)


class Payment(BaseModel):
    __tablename__ = "payments"
    __table_args__ = (
        Index("idx_payment_user_status", "user_id", "status"),
        Index("idx_payment_gateway_id", "gateway_payment_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("user_subscriptions.id", ondelete="SET NULL"),
    )
    payment_method_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("payment_methods.id", ondelete="SET NULL"),
    )
    gateway: Mapped[PaymentGatewayType] = mapped_column(
        ENUM(PaymentGatewayType, name="payment_gateway_type", create_type=True)
    )
    payment_type: Mapped[PaymentType] = mapped_column(
        ENUM(PaymentType, name="payment_type", create_type=True)
    )
    status: Mapped[PaymentStatus] = mapped_column(
        ENUM(PaymentStatus, name="payment_status", create_type=True),
        default=PaymentStatus.PENDING,
    )
    amount: Mapped[int] = mapped_column(BigInteger)  # centavos
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    gateway_payment_id: Mapped[str | None] = mapped_column(
        String(255)
    )  # Stripe PaymentIntent id, MCX ref, etc.
    gateway_response: Mapped[dict] = mapped_column(
        JSONB, default=dict
    )  # full gateway response for audit
    description: Mapped[str | None] = mapped_column(String(255))
    failure_reason: Mapped[str | None] = mapped_column(Text)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
