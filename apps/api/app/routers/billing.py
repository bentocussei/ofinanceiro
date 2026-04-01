"""Billing router: subscription management, plans, promotions, add-ons, Stripe."""

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import SubscriptionPlan
from app.models.plan import Plan
from app.models.subscription import Subscription, UserSubscription
from app.models.user import User
from app.schemas.billing import (
    ModuleAddonResponse,
    PlanResponse,
    PriceBreakdown,
    SubscribeRequest,
    SubscriptionResponse,
    UpgradeRequest,
)
from app.services import billing as billing_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sub_to_response(sub: UserSubscription, features: dict) -> SubscriptionResponse:
    """Convert a UserSubscription model to a SubscriptionResponse schema."""
    snapshot = sub.plan_snapshot or {}
    return SubscriptionResponse(
        id=str(sub.id),
        plan_type=snapshot.get("type", ""),
        plan_name=snapshot.get("name", ""),
        billing_cycle=sub.billing_cycle,
        status=sub.status.value if hasattr(sub.status, "value") else str(sub.status),
        base_price=sub.base_price,
        discount_amount=sub.discount_amount,
        extra_members_count=sub.extra_members_count,
        extra_members_cost=sub.extra_members_cost,
        module_addons_cost=sub.module_addons_cost,
        final_price=sub.final_price,
        start_date=sub.start_date.isoformat(),
        end_date=sub.end_date.isoformat(),
        trial_end_date=sub.trial_end_date.isoformat() if sub.trial_end_date else None,
        auto_renew=sub.auto_renew,
        features=features,
    )


# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------

@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    db: AsyncSession = Depends(get_db),
) -> list[PlanResponse]:
    """Listar todos os planos activos."""
    plans = await billing_service.list_active_plans(db)
    return [
        PlanResponse(
            id=str(p.id),
            type=p.type,
            name=p.name,
            description=p.description,
            base_price_monthly=p.base_price_monthly,
            base_price_annual=p.base_price_annual,
            currency=p.currency.value if hasattr(p.currency, "value") else str(p.currency),
            max_family_members=p.max_family_members,
            extra_member_cost=p.extra_member_cost,
            features=p.features or {},
            is_active=p.is_active,
            sort_order=p.sort_order,
        )
        for p in plans
    ]


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PlanResponse:
    """Obter detalhes de um plano específico."""
    plan = await billing_service._get_plan_or_404(db, plan_id)
    return PlanResponse(
        id=str(plan.id),
        type=plan.type,
        name=plan.name,
        description=plan.description,
        base_price_monthly=plan.base_price_monthly,
        base_price_annual=plan.base_price_annual,
        currency=plan.currency.value if hasattr(plan.currency, "value") else str(plan.currency),
        max_family_members=plan.max_family_members,
        extra_member_cost=plan.extra_member_cost,
        features=plan.features or {},
        is_active=plan.is_active,
        sort_order=plan.sort_order,
    )


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------

@router.get("/subscription", response_model=SubscriptionResponse | None)
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse | None:
    """Obter a subscrição activa do utilizador."""
    sub = await billing_service.get_active_subscription(db, user.id)
    if not sub:
        return None

    features = await billing_service.get_user_features(db, user.id)
    return _sub_to_response(sub, features)


@router.post("/subscribe", response_model=SubscriptionResponse)
async def subscribe(
    data: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Subscrever a um plano."""
    sub = await billing_service.subscribe(
        db,
        user_id=user.id,
        plan_id=data.plan_id,
        billing_cycle=data.billing_cycle,
        promo_code=data.promo_code,
    )
    features = await billing_service.get_user_features(db, user.id)
    return _sub_to_response(sub, features)


@router.post("/preview-price", response_model=PriceBreakdown)
async def preview_price(
    data: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PriceBreakdown:
    """Calcular o preço sem criar subscrição."""
    plan = await billing_service._get_plan_or_404(db, data.plan_id)

    promotion = None
    if data.promo_code:
        plan_type = plan.type.value if hasattr(plan.type, "value") else str(plan.type)
        promotion = await billing_service.validate_promotion(db, data.promo_code, plan_type)

    return await billing_service.calculate_price(
        db, plan, data.billing_cycle, promotion=promotion
    )


@router.post("/upgrade", response_model=SubscriptionResponse)
async def upgrade(
    data: UpgradeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Fazer upgrade do plano (pessoal -> familiar, etc.)."""
    sub = await billing_service.upgrade_subscription(
        db,
        user_id=user.id,
        target_plan_id=data.target_plan_id,
        extra_members=data.extra_members,
    )
    features = await billing_service.get_user_features(db, user.id)
    return _sub_to_response(sub, features)


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Cancelar subscrição (mantém acesso até ao fim do período)."""
    sub = await billing_service.cancel_subscription(db, user.id)
    features = await billing_service.get_user_features(db, user.id)
    return _sub_to_response(sub, features)


@router.post("/reactivate", response_model=SubscriptionResponse)
async def reactivate(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Reactivar subscrição cancelada (se ainda dentro do período)."""
    sub = await billing_service.reactivate_subscription(db, user.id)
    features = await billing_service.get_user_features(db, user.id)
    return _sub_to_response(sub, features)


# ---------------------------------------------------------------------------
# Promotions
# ---------------------------------------------------------------------------

class ApplyPromoBody(BaseModel):
    code: str


@router.post("/apply-promo", response_model=PriceBreakdown)
async def apply_promo(
    data: ApplyPromoBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PriceBreakdown:
    """Aplicar código promocional e ver o desconto resultante.

    Valida o código contra a subscrição activa do utilizador.
    Se não tiver subscrição activa, valida contra o plano pessoal por defeito.
    """
    sub = await billing_service.get_active_subscription(db, user.id)

    if sub and sub.plan_id:
        plan = await billing_service._get_plan_or_404(db, sub.plan_id)
        billing_cycle = sub.billing_cycle
    else:
        # Preview against cheapest plan
        stmt = (
            select(Plan)
            .where(Plan.is_active.is_(True))
            .order_by(Plan.base_price_monthly.asc())
            .limit(1)
        )
        result = await db.execute(stmt)
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum plano disponível.",
            )
        from app.models.enums import BillingCycle
        billing_cycle = BillingCycle.MONTHLY

    plan_type = plan.type.value if hasattr(plan.type, "value") else str(plan.type)
    promotion = await billing_service.validate_promotion(db, data.code, plan_type)
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código promocional inválido ou expirado.",
        )

    return await billing_service.calculate_price(
        db, plan, billing_cycle, promotion=promotion
    )


# ---------------------------------------------------------------------------
# Add-ons
# ---------------------------------------------------------------------------

@router.get("/addons", response_model=list[ModuleAddonResponse])
async def list_addons(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ModuleAddonResponse]:
    """Listar extras disponíveis."""
    addons = await billing_service.list_active_addons(db)
    return [
        ModuleAddonResponse(
            id=str(a.id),
            name=a.name,
            module=a.module,
            description=a.description,
            price_monthly=a.price_monthly,
            price_annual=a.price_annual,
            features_override=a.features_override or {},
            is_active=a.is_active,
        )
        for a in addons
    ]


@router.post("/addons/{addon_id}/add")
async def add_addon(
    addon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Adicionar extra à subscrição activa."""
    sub_addon = await billing_service.add_addon_to_subscription(
        db, user.id, str(addon_id)
    )
    return {
        "message": "Extra adicionado com sucesso.",
        "addon_id": str(sub_addon.module_addon_id),
        "price": sub_addon.price,
    }


@router.delete("/addons/{addon_id}/remove")
async def remove_addon(
    addon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remover extra da subscrição activa."""
    await billing_service.remove_addon_from_subscription(
        db, user.id, str(addon_id)
    )
    return {"message": "Extra removido com sucesso."}


# ---------------------------------------------------------------------------
# Stripe checkout
# ---------------------------------------------------------------------------

@router.post("/checkout")
async def create_checkout(
    plan: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Criar sessão de checkout Stripe para upgrade.

    Em dev sem chaves Stripe, devolve URL mock.
    """
    if plan == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plano inválido para checkout.",
        )

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


# ---------------------------------------------------------------------------
# Stripe webhook
# ---------------------------------------------------------------------------

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
# Helpers internos para gestão de subscrições (Stripe webhook)
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
