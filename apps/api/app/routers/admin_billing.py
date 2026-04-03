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
from app.models.module_addon import ModuleAddon
from app.models.plan import Plan
from app.models.promotion import Promotion, PromotionUsage
from app.models.subscription import UserSubscription
from app.models.user import User
from app.schemas.billing import (
    ModuleAddonCreate,
    ModuleAddonResponse,
    ModuleAddonUpdate,
    PlanCreate,
    PlanResponse,
    PlanUpdate,
    PromotionCreate,
    PromotionResponse,
    PromotionUpdate,
    SubscriptionResponse,
)
from app.services import billing as billing_service
from app.services.permission import has_admin_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/billing", tags=["admin-billing"])


# ---------------------------------------------------------------------------
# Admin permission dependency
# ---------------------------------------------------------------------------


async def require_admin_perm(
    permission_code: str,
    db: AsyncSession,
    user: User,
) -> None:
    """Verificar se o utilizador tem a permissao de administrador requerida."""
    if not await has_admin_permission(db, user.id, permission_code):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissao de administrador.",
        )


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


def _addon_to_response(addon: ModuleAddon) -> ModuleAddonResponse:
    return ModuleAddonResponse(
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
        module_addons_cost=sub.module_addons_cost,
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
    user: User = Depends(get_current_user),
) -> PlanResponse:
    """Criar um novo plano."""
    await require_admin_perm("admin_billing:plans:create", db, user)
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
    logger.info("Plano criado: id=%s, name=%s (por admin=%s)", plan.id, plan.name, user.id)
    return _plan_to_response(plan)


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PlanResponse:
    """Actualizar um plano existente."""
    await require_admin_perm("admin_billing:plans:update", db, user)
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
    logger.info("Plano actualizado: id=%s (por admin=%s)", plan.id, user.id)
    return _plan_to_response(plan)


@router.delete("/plans/{plan_id}")
async def deactivate_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Desactivar um plano (nao elimina, apenas marca como inactivo)."""
    await require_admin_perm("admin_billing:plans:delete", db, user)
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plano não encontrado.",
        )

    plan.is_active = False
    await db.flush()
    logger.info("Plano desactivado: id=%s (por admin=%s)", plan.id, user.id)
    return {"message": "Plano desactivado com sucesso."}


# ---------------------------------------------------------------------------
# Promotions
# ---------------------------------------------------------------------------

@router.get("/promotions", response_model=list[PromotionResponse])
async def list_promotions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PromotionResponse]:
    """Listar todas as promocoes (activas e inactivas)."""
    await require_admin_perm("admin_billing:promotions:read", db, user)
    stmt = select(Promotion).order_by(Promotion.created_at.desc())
    result = await db.execute(stmt)
    promos = result.scalars().all()
    return [_promotion_to_response(p) for p in promos]


@router.post("/promotions", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    data: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromotionResponse:
    """Criar uma nova promocao."""
    await require_admin_perm("admin_billing:promotions:create", db, user)
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
    logger.info("Promocao criada: id=%s, code=%s (por admin=%s)", promo.id, promo.code, user.id)
    return _promotion_to_response(promo)


@router.put("/promotions/{promotion_id}", response_model=PromotionResponse)
async def update_promotion(
    promotion_id: uuid.UUID,
    data: PromotionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromotionResponse:
    """Actualizar uma promocao existente."""
    await require_admin_perm("admin_billing:promotions:update", db, user)
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
    logger.info("Promocao actualizada: id=%s (por admin=%s)", promo.id, user.id)
    return _promotion_to_response(promo)


@router.get("/promotions/{promotion_id}/usage")
async def get_promotion_usage(
    promotion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Ver estatisticas de utilizacao de uma promocao."""
    await require_admin_perm("admin_billing:promotions:read", db, user)
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

@router.post("/addons", response_model=ModuleAddonResponse, status_code=status.HTTP_201_CREATED)
async def create_addon(
    data: ModuleAddonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ModuleAddonResponse:
    """Criar um novo extra (add-on)."""
    await require_admin_perm("admin_billing:addons:create", db, user)
    addon = ModuleAddon(
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
    logger.info("Add-on criado: id=%s, name=%s (por admin=%s)", addon.id, addon.name, user.id)
    return _addon_to_response(addon)


@router.put("/addons/{addon_id}", response_model=ModuleAddonResponse)
async def update_addon(
    addon_id: uuid.UUID,
    data: ModuleAddonUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ModuleAddonResponse:
    """Actualizar um extra (add-on) existente."""
    await require_admin_perm("admin_billing:addons:update", db, user)
    result = await db.execute(select(ModuleAddon).where(ModuleAddon.id == addon_id))
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
    logger.info("Add-on actualizado: id=%s (por admin=%s)", addon.id, user.id)
    return _addon_to_response(addon)


# ---------------------------------------------------------------------------
# Subscriptions (read-only for admin)
# ---------------------------------------------------------------------------

@router.get("/subscriptions", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    status_filter: SubscriptionStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[SubscriptionResponse]:
    """Listar subscricoes (com filtro opcional por estado)."""
    await require_admin_perm("admin_billing:subscriptions:read", db, user)
    stmt = select(UserSubscription).order_by(UserSubscription.created_at.desc())

    if status_filter:
        stmt = stmt.where(UserSubscription.status == status_filter)

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    subs = result.scalars().all()
    return [_sub_to_response(s) for s in subs]


# ---------------------------------------------------------------------------
# Admin Invoicing
# ---------------------------------------------------------------------------

@router.get("/invoices")
async def admin_list_invoices(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    doc_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Listar todas as facturas (admin)."""
    await require_admin_perm("admin_billing:subscriptions:read", db, user)
    from app.services.invoicing import list_all_invoices
    from app.models.enums import DocumentType as DT
    dt = DT(doc_type) if doc_type else None
    invoices = await list_all_invoices(db, doc_type=dt, limit=limit, offset=offset)
    return [
        {
            "id": str(inv.id),
            "document_type": inv.document_type.value,
            "document_number": inv.document_number,
            "customer_name": inv.customer_name,
            "total": inv.total,
            "discount_total": inv.discount_total,
            "status": inv.status.value,
            "issue_date": inv.issue_date.isoformat(),
            "atcud": inv.atcud,
            "agt_sync_status": inv.agt_sync_status.value,
        }
        for inv in invoices
    ]


@router.post("/invoices/{invoice_id}/credit-note")
async def admin_create_credit_note(
    invoice_id: uuid.UUID,
    reason: str = "Reembolso",
    amount: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Emitir nota de credito para uma factura (admin)."""
    await require_admin_perm("admin_billing:subscriptions:create", db, user)
    from app.services.invoicing import create_credit_note
    cn = await create_credit_note(db, invoice_id, reason, amount)
    await db.commit()
    return {
        "id": str(cn.id),
        "document_number": cn.document_number,
        "total": cn.total,
        "status": cn.status.value,
    }


@router.get("/saft-export")
async def admin_saft_export(
    fiscal_year: int,
    start_month: int = 1,
    end_month: int = 12,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> "Response":
    """Exportar ficheiro SAFT-T XML (admin)."""
    await require_admin_perm("admin_billing:subscriptions:read", db, user)
    from fastapi.responses import Response as FastAPIResponse
    from app.services.saft_export import export_saft_xml
    xml_bytes = await export_saft_xml(db, fiscal_year, start_month, end_month)
    filename = f"SAFT-AO_{fiscal_year}_{start_month:02d}-{end_month:02d}.xml"
    return FastAPIResponse(
        content=xml_bytes,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/invoicing/stats")
async def admin_invoicing_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Estatisticas de facturacao (admin)."""
    await require_admin_perm("admin_billing:subscriptions:read", db, user)
    from app.models.invoice import Invoice
    from app.models.enums import DocumentType as DT, AGTSyncStatus

    total_invoices = await db.scalar(select(func.count()).select_from(Invoice).where(Invoice.document_type == DT.INVOICE))
    total_credit_notes = await db.scalar(select(func.count()).select_from(Invoice).where(Invoice.document_type == DT.CREDIT_NOTE))
    total_invoiced = await db.scalar(select(func.coalesce(func.sum(Invoice.total), 0)).where(Invoice.document_type == DT.INVOICE))
    total_credited = await db.scalar(select(func.coalesce(func.sum(Invoice.total), 0)).where(Invoice.document_type == DT.CREDIT_NOTE))
    pending_agt = await db.scalar(select(func.count()).select_from(Invoice).where(Invoice.agt_sync_status == AGTSyncStatus.PENDING))

    return {
        "total_invoices": total_invoices or 0,
        "total_credit_notes": total_credit_notes or 0,
        "total_invoiced_centavos": total_invoiced or 0,
        "total_credited_centavos": total_credited or 0,
        "pending_agt_sync": pending_agt or 0,
    }
