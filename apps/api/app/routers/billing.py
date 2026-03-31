"""Billing router: subscription management and Stripe integration."""

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import SubscriptionPlan
from app.models.subscription import Subscription
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

PLAN_PRICES = {
    "free": {"price": 0, "name": "Gratuito"},
    "personal": {"price": 299, "name": "Pessoal", "stripe_price_id": "price_personal"},
    "family": {"price": 599, "name": "Família", "stripe_price_id": "price_family"},
    "family_plus": {"price": 999, "name": "Família+", "stripe_price_id": "price_family_plus"},
}

PLAN_LIMITS = {
    "free": {"transactions": 50, "ai_questions": 5, "family_members": 0},
    "personal": {"transactions": -1, "ai_questions": -1, "family_members": 0},
    "family": {"transactions": -1, "ai_questions": -1, "family_members": 6},
    "family_plus": {"transactions": -1, "ai_questions": -1, "family_members": -1},
}


@router.get("/subscription")
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get current subscription details."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id).order_by(Subscription.created_at.desc()).limit(1)
    )
    sub = result.scalar_one_or_none()

    current_plan = user.plan or "free"
    limits = PLAN_LIMITS.get(current_plan, PLAN_LIMITS["free"])

    return {
        "plan": current_plan,
        "plan_name": PLAN_PRICES.get(current_plan, {}).get("name", "Gratuito"),
        "status": sub.status if sub else "active",
        "limits": limits,
        "stripe_subscription_id": sub.stripe_subscription_id if sub else None,
    }


@router.get("/plans")
async def get_plans() -> list[dict]:
    """Get all available plans with prices."""
    return [
        {
            "id": plan_id,
            "name": info["name"],
            "price": info["price"],
            "limits": PLAN_LIMITS[plan_id],
        }
        for plan_id, info in PLAN_PRICES.items()
    ]


@router.post("/checkout")
async def create_checkout(
    plan: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Create a Stripe checkout session for upgrading.
    In dev without Stripe keys, returns a mock URL.
    """
    if plan not in PLAN_PRICES or plan == "free":
        return {"error": "Plano inválido"}

    # Mock in development
    if not settings.stripe_secret_key:
        return {
            "checkout_url": f"https://checkout.stripe.com/mock?plan={plan}",
            "mock": True,
            "message": "Stripe não configurado — modo de desenvolvimento",
        }

    # Real Stripe integration would go here
    # stripe.checkout.Session.create(...)
    return {"checkout_url": "https://checkout.stripe.com/...", "session_id": "..."}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Processar eventos do Stripe webhook.

    Valida a assinatura do webhook e processa os eventos:
    - checkout.session.completed: activar subscrição
    - invoice.paid: renovar subscrição
    - customer.subscription.deleted: cancelar subscrição
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.stripe_webhook_secret:
        logger.info("Webhook Stripe recebido mas sem webhook secret configurado (modo dev)")
        return {"received": True}

    try:
        import stripe

        stripe.api_key = settings.stripe_secret_key
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        logger.warning("Webhook Stripe: payload inválido")
        raise HTTPException(status_code=400, detail="Payload inválido") from None
    except Exception as e:
        logger.warning("Webhook Stripe: erro de verificação — %s", e)
        raise HTTPException(status_code=400, detail=f"Erro no webhook: {e!s}") from e

    event_type = event["type"]
    logger.info("Webhook Stripe recebido: %s", event_type)

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        plan = session.get("metadata", {}).get("plan", "personal")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if user_id:
            await _activate_subscription(
                db, user_id, plan, customer_id, subscription_id
            )

    elif event_type == "invoice.paid":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        if customer_id:
            await _extend_subscription(db, customer_id)

    elif event_type == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        if customer_id:
            await _cancel_subscription(db, customer_id)

    else:
        logger.debug("Webhook Stripe ignorado: %s", event_type)

    return {"received": True}


# ---------------------------------------------------------------------------
# Helpers internos para gestão de subscrições
# ---------------------------------------------------------------------------


async def _activate_subscription(
    db: AsyncSession,
    user_id_str: str,
    plan: str,
    customer_id: str | None = None,
    subscription_id: str | None = None,
) -> None:
    """Activar subscrição após checkout concluído."""
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning("ID de utilizador inválido no webhook: %s", user_id_str)
        return

    # Mapear string do plano para enum
    plan_map = {
        "personal": SubscriptionPlan.PERSONAL,
        "family": SubscriptionPlan.FAMILY,
        "family_plus": SubscriptionPlan.FAMILY_PLUS,
    }
    plan_enum = plan_map.get(plan, SubscriptionPlan.PERSONAL)

    # Actualizar utilizador
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("Utilizador não encontrado para activação: %s", user_id)
        return

    user.plan = plan_enum
    user.plan_expires_at = datetime.now(UTC) + timedelta(days=30)

    # Criar registo de subscrição
    now = datetime.now(UTC)
    subscription = Subscription(
        user_id=user_id,
        plan=plan_enum,
        status="active",
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db.add(subscription)
    await db.flush()

    logger.info(
        "Subscrição activada: utilizador=%s, plano=%s", user_id, plan_enum.value
    )


async def _extend_subscription(db: AsyncSession, customer_id: str) -> None:
    """Estender subscrição após pagamento de factura (renovação)."""
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.stripe_customer_id == customer_id,
            Subscription.status == "active",
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        logger.warning(
            "Subscrição não encontrada para renovação: customer=%s", customer_id
        )
        return

    # Estender período
    now = datetime.now(UTC)
    subscription.current_period_start = now
    subscription.current_period_end = now + timedelta(days=30)

    # Actualizar expiração no utilizador
    user_result = await db.execute(
        select(User).where(User.id == subscription.user_id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        user.plan_expires_at = now + timedelta(days=30)

    await db.flush()
    logger.info(
        "Subscrição renovada: utilizador=%s, customer=%s",
        subscription.user_id,
        customer_id,
    )


async def _cancel_subscription(db: AsyncSession, customer_id: str) -> None:
    """Cancelar subscrição (downgrade para plano gratuito)."""
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.stripe_customer_id == customer_id,
            Subscription.status == "active",
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        logger.warning(
            "Subscrição não encontrada para cancelamento: customer=%s", customer_id
        )
        return

    subscription.status = "cancelled"
    subscription.cancel_at = datetime.now(UTC)

    # Downgrade para plano gratuito
    user_result = await db.execute(
        select(User).where(User.id == subscription.user_id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        user.plan = SubscriptionPlan.FREE
        user.plan_expires_at = None

    await db.flush()
    logger.info(
        "Subscrição cancelada: utilizador=%s, customer=%s",
        subscription.user_id,
        customer_id,
    )
