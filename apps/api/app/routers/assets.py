"""Assets router: CRUD for physical/tangible assets (real estate, vehicles, etc.)."""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import get_current_user
from app.models.asset import Asset
from app.models.enums import AssetType, CurrencyCode
from app.models.user import User

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

ASSET_TYPE_LABELS: dict[AssetType, str] = {
    AssetType.REAL_ESTATE: "Imóveis",
    AssetType.VEHICLE: "Veículos",
    AssetType.LAND: "Terrenos",
    AssetType.JEWELRY: "Jóias",
    AssetType.ART: "Arte",
    AssetType.ELECTRONICS: "Electrónicos",
    AssetType.FURNITURE: "Mobiliário",
    AssetType.LIVESTOCK: "Gado",
    AssetType.BUSINESS_EQUITY: "Participações em Negócios",
    AssetType.OTHER: "Outros",
}


class AssetCreate(BaseModel):
    name: str = Field(max_length=100)
    type: AssetType
    description: str | None = None
    purchase_price: int = Field(ge=0)
    purchase_date: date | None = None
    current_value: int = Field(ge=0)
    last_valuation_date: date | None = None
    currency: CurrencyCode = CurrencyCode.AOA
    annual_change_rate: int | None = None
    details: dict = Field(default_factory=dict)
    linked_debt_id: uuid.UUID | None = None
    linked_account_id: uuid.UUID | None = None
    is_insured: bool = False
    insurance_value: int | None = None
    insurance_expiry: date | None = None
    notes: str | None = None
    family_id: uuid.UUID | None = None


class AssetUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    type: AssetType | None = None
    description: str | None = None
    purchase_price: int | None = Field(None, ge=0)
    purchase_date: date | None = None
    current_value: int | None = Field(None, ge=0)
    last_valuation_date: date | None = None
    currency: CurrencyCode | None = None
    annual_change_rate: int | None = None
    details: dict | None = None
    linked_debt_id: uuid.UUID | None = None
    linked_account_id: uuid.UUID | None = None
    is_active: bool | None = None
    sold_at: datetime | None = None
    sold_price: int | None = None
    is_insured: bool | None = None
    insurance_value: int | None = None
    insurance_expiry: date | None = None
    notes: str | None = None
    family_id: uuid.UUID | None = None


class AssetRevalue(BaseModel):
    current_value: int = Field(ge=0)
    valuation_date: date | None = None


def _serialize_asset(a: Asset) -> dict:
    appreciation = a.current_value - a.purchase_price
    appreciation_pct = (
        round(appreciation / a.purchase_price * 100, 1)
        if a.purchase_price > 0
        else 0
    )
    return {
        "id": str(a.id),
        "name": a.name,
        "type": a.type,
        "type_label": ASSET_TYPE_LABELS.get(a.type, "Outros"),
        "description": a.description,
        "purchase_price": a.purchase_price,
        "purchase_date": str(a.purchase_date) if a.purchase_date else None,
        "current_value": a.current_value,
        "last_valuation_date": str(a.last_valuation_date) if a.last_valuation_date else None,
        "currency": a.currency,
        "annual_change_rate": a.annual_change_rate,
        "details": a.details,
        "linked_debt_id": str(a.linked_debt_id) if a.linked_debt_id else None,
        "linked_account_id": str(a.linked_account_id) if a.linked_account_id else None,
        "is_active": a.is_active,
        "sold_at": a.sold_at.isoformat() if a.sold_at else None,
        "sold_price": a.sold_price,
        "is_insured": a.is_insured,
        "insurance_value": a.insurance_value,
        "insurance_expiry": str(a.insurance_expiry) if a.insurance_expiry else None,
        "notes": a.notes,
        "family_id": str(a.family_id) if a.family_id else None,
        "appreciation": appreciation,
        "appreciation_pct": appreciation_pct,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


async def _get_asset_or_404(
    db: AsyncSession,
    asset_id: uuid.UUID,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Asset:
    stmt = select(Asset).where(Asset.id == asset_id)
    if family_id is not None:
        stmt = stmt.where(Asset.family_id == family_id)
    else:
        stmt = stmt.where(Asset.user_id == user_id, Asset.family_id.is_(None))
    result = await db.execute(stmt)
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Bem não encontrado")
    return asset


@router.get("/")
async def list_assets(
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    type: AssetType | None = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    stmt = select(Asset)
    if ctx.is_family:
        stmt = stmt.where(Asset.family_id == ctx.family_id)
    else:
        stmt = stmt.where(Asset.user_id == user.id, Asset.family_id.is_(None))
    if active_only:
        stmt = stmt.where(Asset.is_active.is_(True))
    if type:
        stmt = stmt.where(Asset.type == type)
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Asset.id < cursor_uuid)
    stmt = stmt.order_by(Asset.created_at.desc(), Asset.id.desc())
    stmt = stmt.limit(limit + 1)

    result = await db.execute(stmt)
    assets = list(result.scalars().all())

    next_cursor = None
    if len(assets) > limit:
        assets = assets[:limit]
        next_cursor = str(assets[-1].id)

    return {
        "items": [_serialize_asset(a) for a in assets],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    stmt = select(Asset).where(Asset.is_active.is_(True))
    if ctx.is_family:
        stmt = stmt.where(Asset.family_id == ctx.family_id)
    else:
        stmt = stmt.where(Asset.user_id == user.id, Asset.family_id.is_(None))
    result = await db.execute(stmt)
    assets = list(result.scalars().all())

    total_value = sum(a.current_value for a in assets)
    total_purchase_price = sum(a.purchase_price for a in assets)
    total_appreciation = total_value - total_purchase_price

    # Group by type
    by_type_map: dict[AssetType, dict] = {}
    for a in assets:
        if a.type not in by_type_map:
            by_type_map[a.type] = {
                "type": a.type,
                "label": ASSET_TYPE_LABELS.get(a.type, "Outros"),
                "count": 0,
                "total_value": 0,
            }
        by_type_map[a.type]["count"] += 1
        by_type_map[a.type]["total_value"] += a.current_value

    by_type = sorted(by_type_map.values(), key=lambda x: x["total_value"], reverse=True)

    return {
        "total_value": total_value,
        "total_purchase_price": total_purchase_price,
        "total_appreciation": total_appreciation,
        "by_type": by_type,
        "items": [_serialize_asset(a) for a in assets],
    }


@router.post("/", status_code=201)
async def create_asset(
    data: AssetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    asset = Asset(
        user_id=user.id,
        family_id=ctx.family_id,
        name=data.name,
        type=data.type,
        description=data.description,
        purchase_price=data.purchase_price,
        purchase_date=data.purchase_date,
        current_value=data.current_value,
        last_valuation_date=data.last_valuation_date,
        currency=data.currency,
        annual_change_rate=data.annual_change_rate,
        details=data.details,
        linked_debt_id=data.linked_debt_id,
        linked_account_id=data.linked_account_id,
        is_insured=data.is_insured,
        insurance_value=data.insurance_value,
        insurance_expiry=data.insurance_expiry,
        notes=data.notes,
    )
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return _serialize_asset(asset)


@router.put("/{asset_id}")
async def update_asset(
    asset_id: uuid.UUID,
    data: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    asset = await _get_asset_or_404(db, asset_id, user.id, ctx.family_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)
    await db.flush()
    await db.refresh(asset)
    return _serialize_asset(asset)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_add_transactions")
    asset = await _get_asset_or_404(db, asset_id, user.id, ctx.family_id)
    await db.delete(asset)
    await db.flush()


@router.post("/{asset_id}/revalue")
async def revalue_asset(
    asset_id: uuid.UUID,
    data: AssetRevalue,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Actualizar o valor corrente de um bem com nova data de avaliação."""
    require_permission(ctx, "can_add_transactions")
    asset = await _get_asset_or_404(db, asset_id, user.id, ctx.family_id)

    asset.current_value = data.current_value
    asset.last_valuation_date = data.valuation_date or date.today()
    await db.flush()
    await db.refresh(asset)
    return _serialize_asset(asset)
