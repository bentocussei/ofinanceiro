"""Income Sources router: CRUD para fontes de rendimento."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.income_source import IncomeSource
from app.models.user import User

router = APIRouter(prefix="/api/v1/income-sources", tags=["income-sources"])


@router.get("/")
async def list_income_sources(
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(IncomeSource).where(IncomeSource.user_id == user.id)
    if is_active is not None:
        stmt = stmt.where(IncomeSource.is_active == is_active)
    stmt = stmt.order_by(IncomeSource.created_at.desc())
    result = await db.execute(stmt)
    sources = result.scalars().all()
    return [_to_dict(s) for s in sources]


@router.post("/", status_code=201)
async def create_income_source(
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    source = IncomeSource(user_id=user.id, **data)
    db.add(source)
    await db.flush()
    await db.refresh(source)
    return _to_dict(source)


@router.put("/{source_id}")
async def update_income_source(
    source_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    source = await _get_or_404(db, source_id, user.id)
    for key, value in data.items():
        if hasattr(source, key):
            setattr(source, key, value)
    await db.flush()
    await db.refresh(source)
    return _to_dict(source)


@router.delete("/{source_id}", status_code=204)
async def delete_income_source(
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    source = await _get_or_404(db, source_id, user.id)
    await db.delete(source)


async def _get_or_404(db: AsyncSession, source_id: uuid.UUID, user_id: uuid.UUID) -> IncomeSource:
    stmt = select(IncomeSource).where(IncomeSource.id == source_id, IncomeSource.user_id == user_id)
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
