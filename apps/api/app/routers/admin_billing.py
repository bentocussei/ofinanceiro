"""Admin billing router: manage plans, promotions, add-ons, subscriptions."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import SubscriptionStatus
from app.models.feature_addon import FeatureAddon
from app.models.plan import Plan
from app.models.promotion import Promotion, PromotionUsage
from app.models.subscription import UserSubscription
from app.models.user import User
from app.schemas.billing import (
    FeatureAddonCreate,
    FeatureAddonResponse,
    FeatureAddonUpdate,
    PlanCreate,
    PlanResponse,
    PlanUpdate,
    PromotionCreate,
    PromotionResponse,
    PromotionUpdate,
    SubscriptionResponse,
)
from app.services import billing as billing_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/billing", tags=["admin-billing"])


# ---------------------------------------------------------------------------
# Admin dependency
# ---------------------------------------------------------------------------

async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Verificar se o utilizador é administrador.

    Verifica o campo preferences.is_admin no registo do utilizador.
    """
    if not user.preferences.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    return user


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _plan_to_response(plan: Plan) -> PlanResponse:
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


def _promotion_to_response(promo: Promotion) -> PromotionResponse:
    return PromotionResponse(
        id=str(promo.id),
        name=promo.name,
        code=promo.code,
        type=promo.type,
        value=promo.value,
        start_date=promo.start_date.isoformat(),
        end_date=promo.end_date.isoformat() if promo.end_date else None,
        apply_to_all=promo.apply_to_all,
        applicable_plan_types=promo.applicable_plan_types or [],
        max_beneficiaries=promo.max_beneficiaries,
        current_usage_count=promo.current_usage_count,
        auto_apply_on_register=promo.auto_apply_on_register,
        free_days=promo.free_days,
        is_active=promo.is_active,
    )


def _addon_to_response(addon: FeatureAddon) -> FeatureAddonResponse:
    return FeatureAddonResponse(
        id=str(addon.id),
        name=addon.name,
        module=addon.module,
        description=addon.description,
        price_monthly=addon.price_monthly,
        price_annual=addon.price_annual,
        features_override=addon.features_override or {},
        is_active=addon.is_active,
    )


def _sub_to_response(sub: UserSubscription) -> SubscriptionResponse:
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
        feature_addons_cost=sub.feature_addons_cost,
        final_price=sub.final_price,
        start_date=sub.start_date.isoformat(),
        end_date=sub.end_date.isoformat(),
        trial_end_date=sub.trial_end_date.isoformat() if sub.trial_end_date else None,
        auto_renew=sub.auto_renew,
        features=snapshot.get("features", {}),
    )


# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------

@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PlanResponse:
    """Criar um novo plano."""
    plan = Plan(
        type=data.type,
        name=data.name,
        description=data.description,
        base_price_monthly=data.base_price_monthly,
        base_price_annual=data.base_price_annual,
        currency=data.currency,
        max_family_members=data.max_family_members,
        extra_member_cost=data.extra_member_cost,
        features=data.features,
        sort_order=data.sort_order,
        is_active=True,
    )
    db.add(plan)
    await db.flush()
    await db.refresh(plan)
    logger.info("Plano criado: id=%s, name=%s (por admin=%s)", plan.id, plan.name, admin.id)
    return _plan_to_response(plan)


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PlanResponse:
    """Actualizar um plano existente."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plano não encontrado.",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    await db.flush()
    await db.refresh(plan)
    logger.info("Plano actualizado: id=%s (por admin=%s)", plan.id, admin.id)
    return _plan_to_response(plan)


@router.delete("/plans/{plan_id}")
async def deactivate_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Desactivar um plano (não elimina, apenas marca como inactivo)."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plano não encontrado.",
        )

    plan.is_active = False
    await db.flush()
    logger.info("Plano desactivado: id=%s (por admin=%s)", plan.id, admin.id)
    return {"message": "Plano desactivado com sucesso."}


# ---------------------------------------------------------------------------
# Promotions
# ---------------------------------------------------------------------------

@router.get("/promotions", response_model=list[PromotionResponse])
async def list_promotions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[PromotionResponse]:
    """Listar todas as promoções (activas e inactivas)."""
    stmt = select(Promotion).order_by(Promotion.created_at.desc())
    result = await db.execute(stmt)
    promos = result.scalars().all()
    return [_promotion_to_response(p) for p in promos]


@router.post("/promotions", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    data: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PromotionResponse:
    """Criar uma nova promoção."""
    # Parse dates
    start_date = datetime.fromisoformat(data.start_date)
    end_date = datetime.fromisoformat(data.end_date) if data.end_date else None

    promo = Promotion(
        name=data.name,
        code=data.code,
        type=data.type,
        value=data.value,
        start_date=start_date,
        end_date=end_date,
        apply_to_all=data.apply_to_all,
        applicable_plan_types=data.applicable_plan_types,
        max_beneficiaries=data.max_beneficiaries,
        auto_apply_on_register=data.auto_apply_on_register,
        free_days=data.free_days,
        current_usage_count=0,
        is_active=True,
    )
    db.add(promo)
    await db.flush()
    await db.refresh(promo)
    logger.info("Promoção criada: id=%s, code=%s (por admin=%s)", promo.id, promo.code, admin.id)
    return _promotion_to_response(promo)


@router.put("/promotions/{promotion_id}", response_model=PromotionResponse)
async def update_promotion(
    promotion_id: uuid.UUID,
    data: PromotionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PromotionResponse:
    """Actualizar uma promoção existente."""
    result = await db.execute(select(Promotion).where(Promotion.id == promotion_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promoção não encontrada.",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "end_date" and value is not None:
            value = datetime.fromisoformat(value)
        setattr(promo, field, value)

    await db.flush()
    await db.refresh(promo)
    logger.info("Promoção actualizada: id=%s (por admin=%s)", promo.id, admin.id)
    return _promotion_to_response(promo)


@router.get("/promotions/{promotion_id}/usage")
async def get_promotion_usage(
    promotion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Ver estatísticas de utilização de uma promoção."""
    # Check promotion exists
    result = await db.execute(select(Promotion).where(Promotion.id == promotion_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promoção não encontrada.",
        )

    # Get usage stats
    usage_count_stmt = (
        select(func.count())
        .select_from(PromotionUsage)
        .where(PromotionUsage.promotion_id == promotion_id)
    )
    total_discount_stmt = (
        select(func.coalesce(func.sum(PromotionUsage.discount_amount), 0))
        .where(PromotionUsage.promotion_id == promotion_id)
    )

    count_result = await db.execute(usage_count_stmt)
    discount_result = await db.execute(total_discount_stmt)

    usage_count = count_result.scalar() or 0
    total_discount = discount_result.scalar() or 0

    return {
        "promotion_id": str(promo.id),
        "promotion_name": promo.name,
        "code": promo.code,
        "usage_count": usage_count,
        "max_beneficiaries": promo.max_beneficiaries,
        "total_discount_given": total_discount,
        "is_active": promo.is_active,
    }


# ---------------------------------------------------------------------------
# Add-ons
# ---------------------------------------------------------------------------

@router.post("/addons", response_model=FeatureAddonResponse, status_code=status.HTTP_201_CREATED)
async def create_addon(
    data: FeatureAddonCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> FeatureAddonResponse:
    """Criar um novo extra (add-on)."""
    addon = FeatureAddon(
        name=data.name,
        module=data.module,
        description=data.description,
        price_monthly=data.price_monthly,
        price_annual=data.price_annual,
        features_override=data.features_override,
        is_active=True,
        sort_order=data.sort_order,
    )
    db.add(addon)
    await db.flush()
    await db.refresh(addon)
    logger.info("Add-on criado: id=%s, name=%s (por admin=%s)", addon.id, addon.name, admin.id)
    return _addon_to_response(addon)


@router.put("/addons/{addon_id}", response_model=FeatureAddonResponse)
async def update_addon(
    addon_id: uuid.UUID,
    data: FeatureAddonUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> FeatureAddonResponse:
    """Actualizar um extra (add-on) existente."""
    result = await db.execute(select(FeatureAddon).where(FeatureAddon.id == addon_id))
    addon = result.scalar_one_or_none()
    if not addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extra não encontrado.",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(addon, field, value)

    await db.flush()
    await db.refresh(addon)
    logger.info("Add-on actualizado: id=%s (por admin=%s)", addon.id, admin.id)
    return _addon_to_response(addon)


# ---------------------------------------------------------------------------
# Subscriptions (read-only for admin)
# ---------------------------------------------------------------------------

@router.get("/subscriptions", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
    status_filter: SubscriptionStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[SubscriptionResponse]:
    """Listar subscrições (com filtro opcional por estado)."""
    stmt = select(UserSubscription).order_by(UserSubscription.created_at.desc())

    if status_filter:
        stmt = stmt.where(UserSubscription.status == status_filter)

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    subs = result.scalars().all()
    return [_sub_to_response(s) for s in subs]
