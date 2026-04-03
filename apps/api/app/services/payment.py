"""Payment service: payment method management, charge orchestration, payment ledger."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.gateways import get_gateway, list_available_gateways
from app.gateways.base import ChargeResult
from app.models.enums import (
    CurrencyCode,
    PaymentGatewayType,
    PaymentStatus,
    PaymentType,
)
from app.models.payment import Payment
from app.models.payment_method import PaymentMethod
from app.models.subscription import UserSubscription
from app.models.user import User

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Available gateways
# ---------------------------------------------------------------------------

async def get_available_gateways() -> list[dict]:
    """Return list of available gateways with display info."""
    gateway_info = {
        PaymentGatewayType.STRIPE: {
            "name": "Cartão Internacional",
            "description": "Visa, Mastercard, American Express",
            "icon": "credit-card",
        },
        PaymentGatewayType.REFERENCIA_BANCARIA: {
            "name": "Referência Bancária",
            "description": "Pague em qualquer Multicaixa ATM ou home banking",
            "icon": "landmark",
        },
        PaymentGatewayType.MULTICAIXA_EXPRESS: {
            "name": "Multicaixa Express",
            "description": "Pague com a app Multicaixa Express",
            "icon": "smartphone",
        },
        PaymentGatewayType.UNITEL_MONEY: {
            "name": "Unitel Money",
            "description": "Pague com a sua carteira Unitel Money",
            "icon": "wallet",
        },
        PaymentGatewayType.E_KWANZA: {
            "name": "e-Kwanza",
            "description": "Pague com a sua carteira e-Kwanza",
            "icon": "wallet",
        },
        PaymentGatewayType.PAYPAY: {
            "name": "PayPay",
            "description": "Pague com a sua conta PayPay",
            "icon": "wallet",
        },
    }
    available = list_available_gateways()
    return [
        {"gateway": gw.value, **gateway_info.get(gw, {"name": gw.value})}
        for gw in available
    ]


# ---------------------------------------------------------------------------
# Payment method management
# ---------------------------------------------------------------------------

async def add_payment_method(
    db: AsyncSession,
    user_id: uuid.UUID,
    gateway: PaymentGatewayType,
    payment_method_token: str,
    set_as_default: bool = True,
) -> PaymentMethod:
    """Add a payment method from a gateway (e.g. after Stripe SetupIntent completes)."""
    gw = get_gateway(gateway)
    details = await gw.get_payment_method_details(payment_method_token)

    label = details.get("label", f"{gateway.value} ***")
    method_type_str = details.get("type", "credit_card")

    # Map Stripe types to our enum
    from app.models.enums import PaymentMethodType

    type_map = {
        "card": PaymentMethodType.CREDIT_CARD,
        "credit_card": PaymentMethodType.CREDIT_CARD,
        "debit_card": PaymentMethodType.DEBIT_CARD,
        "mobile_money": PaymentMethodType.MOBILE_MONEY,
        "bank_reference": PaymentMethodType.BANK_REFERENCE,
        "digital_wallet": PaymentMethodType.DIGITAL_WALLET,
    }
    method_type = type_map.get(method_type_str, PaymentMethodType.CREDIT_CARD)

    # If setting as default, unset any existing default
    if set_as_default:
        await _unset_all_defaults(db, user_id)

    # Check if this token already exists (avoid duplicates)
    existing = await db.scalar(
        select(PaymentMethod).where(
            PaymentMethod.user_id == user_id,
            PaymentMethod.gateway_token == payment_method_token,
            PaymentMethod.is_active.is_(True),
        )
    )
    if existing:
        if set_as_default and not existing.is_default:
            existing.is_default = True
            await db.commit()
            await db.refresh(existing)
        return existing

    pm = PaymentMethod(
        user_id=user_id,
        gateway=gateway,
        method_type=method_type,
        is_default=set_as_default,
        label=label,
        gateway_token=payment_method_token,
        metadata_=details,
        is_active=True,
    )
    db.add(pm)
    await db.commit()
    await db.refresh(pm)
    return pm


async def remove_payment_method(
    db: AsyncSession,
    user_id: uuid.UUID,
    payment_method_id: uuid.UUID,
) -> None:
    """Deactivate a payment method. Detaches from gateway."""
    pm = await db.scalar(
        select(PaymentMethod).where(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == user_id,
            PaymentMethod.is_active.is_(True),
        )
    )
    if not pm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Método de pagamento não encontrado",
        )

    # Don't allow removing the only payment method on an active subscription
    if pm.is_default:
        active_sub = await db.scalar(
            select(UserSubscription).where(
                UserSubscription.user_id == user_id,
                UserSubscription.status.in_(["active", "trialing"]),
                UserSubscription.auto_renew.is_(True),
            )
        )
        if active_sub:
            # Check if there are other active methods
            other = await db.scalar(
                select(PaymentMethod).where(
                    PaymentMethod.user_id == user_id,
                    PaymentMethod.id != payment_method_id,
                    PaymentMethod.is_active.is_(True),
                )
            )
            if not other:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não pode remover o único método de pagamento com subscrição activa",
                )
            # Promote the other to default
            other.is_default = True

    # Detach from gateway
    try:
        gw = get_gateway(pm.gateway)
        await gw.detach_payment_method(pm.gateway_token)
    except Exception:
        logger.warning("Could not detach PM %s from gateway", pm.id)

    pm.is_active = False
    pm.is_default = False
    await db.commit()


async def set_default_payment_method(
    db: AsyncSession,
    user_id: uuid.UUID,
    payment_method_id: uuid.UUID,
) -> PaymentMethod:
    """Set a payment method as the user's default."""
    pm = await db.scalar(
        select(PaymentMethod).where(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == user_id,
            PaymentMethod.is_active.is_(True),
        )
    )
    if not pm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Método de pagamento não encontrado",
        )

    await _unset_all_defaults(db, user_id)
    pm.is_default = True
    await db.commit()
    await db.refresh(pm)
    return pm


async def list_payment_methods(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[PaymentMethod]:
    """List all active payment methods for a user."""
    result = await db.scalars(
        select(PaymentMethod)
        .where(
            PaymentMethod.user_id == user_id,
            PaymentMethod.is_active.is_(True),
        )
        .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
    )
    return list(result.all())


async def get_default_payment_method(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> PaymentMethod | None:
    """Get user's default payment method."""
    return await db.scalar(
        select(PaymentMethod).where(
            PaymentMethod.user_id == user_id,
            PaymentMethod.is_default.is_(True),
            PaymentMethod.is_active.is_(True),
        )
    )


# ---------------------------------------------------------------------------
# Stripe setup
# ---------------------------------------------------------------------------

async def create_stripe_setup_intent(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> dict:
    """Create a Stripe SetupIntent for adding a card."""
    gw = get_gateway(PaymentGatewayType.STRIPE)

    # Get user details
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")

    customer_id = await gw.get_or_create_customer(
        user_id=str(user_id),
        name=user.name,
        phone=user.phone,
        email=user.email,
    )
    result = await gw.create_setup_session(customer_id=customer_id)
    return {
        "client_secret": result.client_secret,
        "publishable_key": result.metadata.get("publishable_key", ""),
        "customer_id": customer_id,
    }


# ---------------------------------------------------------------------------
# Charges
# ---------------------------------------------------------------------------

async def charge_subscription(
    db: AsyncSession,
    subscription: UserSubscription,
    payment_method: PaymentMethod | None = None,
) -> Payment:
    """Charge a subscription using its payment method."""
    if not payment_method:
        payment_method = await get_default_payment_method(db, subscription.user_id)

    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum método de pagamento configurado",
        )

    gw = get_gateway(payment_method.gateway)

    # Get or create customer for this gateway
    user = await db.get(User, subscription.user_id)
    customer_id = await gw.get_or_create_customer(
        user_id=str(subscription.user_id),
        name=user.name if user else None,
        phone=user.phone if user else None,
    )

    plan_name = subscription.plan_snapshot.get("name", "Subscrição")
    description = f"O Financeiro — {plan_name}"

    # Create pending payment record
    payment = Payment(
        user_id=subscription.user_id,
        subscription_id=subscription.id,
        payment_method_id=payment_method.id,
        gateway=payment_method.gateway,
        payment_type=PaymentType.SUBSCRIPTION,
        status=PaymentStatus.PENDING,
        amount=subscription.final_price,
        currency=CurrencyCode.AOA,
        description=description,
    )
    db.add(payment)
    await db.flush()

    # Charge
    result: ChargeResult = await gw.create_charge(
        amount=subscription.final_price,
        currency="aoa",
        payment_method_token=payment_method.gateway_token,
        customer_id=customer_id,
        metadata={
            "user_id": str(subscription.user_id),
            "subscription_id": str(subscription.id),
            "payment_id": str(payment.id),
        },
    )

    # Update payment record
    payment.status = result.status
    payment.gateway_payment_id = result.gateway_payment_id
    payment.gateway_response = result.gateway_response
    payment.failure_reason = result.failure_reason
    if result.success:
        payment.paid_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(payment)

    # Generate invoice + receipt for completed payments
    if result.success:
        try:
            from app.services.invoicing import create_invoice_for_payment, create_receipt_for_payment
            invoice = await create_invoice_for_payment(db, payment, subscription)
            await create_receipt_for_payment(db, payment, invoice)
            await db.commit()
        except Exception:
            logger.exception("Erro ao gerar factura/recibo para pagamento %s", payment.id)

    return payment


async def record_payment(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: int,
    currency: CurrencyCode,
    gateway: PaymentGatewayType,
    payment_type: PaymentType,
    gateway_payment_id: str | None = None,
    gateway_response: dict | None = None,
    subscription_id: uuid.UUID | None = None,
    payment_method_id: uuid.UUID | None = None,
    description: str | None = None,
    payment_status: PaymentStatus = PaymentStatus.COMPLETED,
) -> Payment:
    """Record a payment in the ledger (e.g. from webhook confirmation)."""
    # Idempotency: check if this gateway payment already recorded
    if gateway_payment_id:
        existing = await db.scalar(
            select(Payment).where(
                Payment.gateway_payment_id == gateway_payment_id,
            )
        )
        if existing:
            return existing

    payment = Payment(
        user_id=user_id,
        subscription_id=subscription_id,
        payment_method_id=payment_method_id,
        gateway=gateway,
        payment_type=payment_type,
        status=payment_status,
        amount=amount,
        currency=currency,
        gateway_payment_id=gateway_payment_id,
        gateway_response=gateway_response or {},
        description=description,
        paid_at=datetime.now(timezone.utc) if payment_status == PaymentStatus.COMPLETED else None,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # Generate invoice + receipt for completed payments
    if payment_status == PaymentStatus.COMPLETED:
        try:
            from app.services.invoicing import create_invoice_for_payment, create_receipt_for_payment
            from app.models.subscription import UserSubscription

            sub = None
            if subscription_id:
                sub = await db.get(UserSubscription, subscription_id)
            invoice = await create_invoice_for_payment(db, payment, sub)
            await create_receipt_for_payment(db, payment, invoice)
            await db.commit()
        except Exception:
            logger.exception("Erro ao gerar factura/recibo para pagamento %s", payment.id)

    return payment


# ---------------------------------------------------------------------------
# Payment history
# ---------------------------------------------------------------------------

async def list_payments(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Payment]:
    """List payment history for a user."""
    result = await db.scalars(
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.all())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _unset_all_defaults(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Remove default flag from all user's payment methods."""
    await db.execute(
        update(PaymentMethod)
        .where(
            PaymentMethod.user_id == user_id,
            PaymentMethod.is_default.is_(True),
        )
        .values(is_default=False)
    )
