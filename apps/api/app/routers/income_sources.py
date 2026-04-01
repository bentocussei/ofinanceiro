"""Income Sources router: CRUD para fontes de rendimento."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.enums import CurrencyCode, IncomeSourceType, RecurrenceFrequency
from app.models.income_source import IncomeSource
from app.models.user import User

router = APIRouter(prefix="/api/v1/income-sources", tags=["income-sources"])


class IncomeSourceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=100)
    type: IncomeSourceType
    description: str | None = None
    expected_amount: int = Field(gt=0)
    currency: CurrencyCode = CurrencyCode.AOA
    frequency: RecurrenceFrequency = RecurrenceFrequency.MONTHLY
    day_of_month: int | None = Field(None, ge=1, le=31)
    account_id: uuid.UUID | None = None
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    is_active: bool = True


class IncomeSourceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(None, max_length=100)
    type: IncomeSourceType | None = None
    description: str | None = None
    expected_amount: int | None = Field(None, gt=0)
    currency: CurrencyCode | None = None
    frequency: RecurrenceFrequency | None = None
    day_of_month: int | None = Field(None, ge=1, le=31)
    account_id: uuid.UUID | None = None
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    is_active: bool | None = None


@router.get("/")
async def list_income_sources(
    is_active: bool | None = None,
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    stmt = select(IncomeSource)
    if ctx.is_family:
        stmt = stmt.where(IncomeSource.family_id == ctx.family_id)
    else:
        stmt = stmt.where(IncomeSource.user_id == user.id, IncomeSource.family_id.is_(None))
    if is_active is not None:
        stmt = stmt.where(IncomeSource.is_active == is_active)
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(IncomeSource.id < cursor_uuid)
    stmt = stmt.order_by(IncomeSource.created_at.desc(), IncomeSource.id.desc())
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    sources = list(result.scalars().all())

    next_cursor = None
    if len(sources) > limit:
        sources = sources[:limit]
        next_cursor = str(sources[-1].id)

    return {
        "items": [_to_dict(s) for s in sources],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.post("/", status_code=201)
async def create_income_source(
    data: IncomeSourceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("income_sources:manage:create"),
) -> dict:
    require_permission(ctx, "can_edit_budgets")
    source = IncomeSource(user_id=user.id, family_id=ctx.family_id, **data.model_dump(exclude_unset=True))
    db.add(source)
    await db.flush()
    await db.refresh(source)
    return _to_dict(source)


@router.put("/{source_id}")
async def update_income_source(
    source_id: uuid.UUID,
    data: IncomeSourceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_edit_budgets")
    source = await _get_or_404(db, source_id, user.id, family_id=ctx.family_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(source, key, value)
    await db.flush()
    await db.refresh(source)
    return _to_dict(source)


@router.delete("/{source_id}", status_code=204)
async def delete_income_source(
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_edit_budgets")
    source = await _get_or_404(db, source_id, user.id, family_id=ctx.family_id)
    await db.delete(source)


async def _get_or_404(
    db: AsyncSession,
    source_id: uuid.UUID,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> IncomeSource:
    stmt = select(IncomeSource).where(IncomeSource.id == source_id)
    if family_id is not None:
        stmt = stmt.where(IncomeSource.family_id == family_id)
    else:
        stmt = stmt.where(IncomeSource.user_id == user_id, IncomeSource.family_id.is_(None))
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Fonte de rendimento não encontrada"},
        )
    return source


def _to_dict(source: IncomeSource) -> dict:
    return {
        "id": source.id,
        "user_id": source.user_id,
        "family_id": source.family_id,
        "name": source.name,
        "type": source.type,
        "description": source.description,
        "expected_amount": source.expected_amount,
        "currency": source.currency,
        "frequency": source.frequency,
        "day_of_month": source.day_of_month,
        "account_id": source.account_id,
        "icon": source.icon,
        "color": source.color,
        "is_active": source.is_active,
        "created_at": source.created_at,
        "updated_at": source.updated_at,
    }
