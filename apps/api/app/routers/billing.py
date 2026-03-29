"""Billing router: subscription management and Stripe integration."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.subscription import Subscription
from app.models.user import User

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
async def stripe_webhook() -> dict:
    """Handle Stripe webhook events.
    In production, validates signature and processes events.
    """
    # Stripe webhook handling would go here
    return {"received": True}
