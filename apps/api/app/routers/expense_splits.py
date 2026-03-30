"""Expense Splits router: divisão de despesas familiares."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import get_current_user
from app.models.expense_split import ExpenseSplit, ExpenseSplitPart
from app.models.family import FamilyMember
from app.models.user import User

router = APIRouter(prefix="/api/v1/expense-splits", tags=["expense-splits"])


async def _get_user_family_id(db: AsyncSession, user_id: uuid.UUID) -> uuid.UUID | None:
    """Retorna o family_id do utilizador, se pertencer a uma família."""
    stmt = select(FamilyMember.family_id).where(
        FamilyMember.user_id == user_id, FamilyMember.is_active.is_(True)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


@router.get("/")
async def list_expense_splits(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    family_id = await _get_user_family_id(db, user.id)
    if not family_id:
        return []
    stmt = (
        select(ExpenseSplit)
        .where(ExpenseSplit.family_id == family_id)
        .options(selectinload(ExpenseSplit.parts))
        .order_by(ExpenseSplit.created_at.desc())
    )
    result = await db.execute(stmt)
    splits = result.scalars().all()
    return [_to_dict(s) for s in splits]


@router.post("/", status_code=201)
async def create_expense_split(
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    family_id = await _get_user_family_id(db, user.id)
    if not family_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_FAMILY", "message": "Utilizador não pertence a nenhuma família"},
        )
    parts_data = data.pop("parts", [])
    split = ExpenseSplit(family_id=family_id, **data)
    db.add(split)
    await db.flush()

    for part in parts_data:
        split_part = ExpenseSplitPart(split_id=split.id, **part)
        db.add(split_part)

    await db.flush()
    await db.refresh(split)
    # Reload with parts
    stmt = (
        select(ExpenseSplit)
        .where(ExpenseSplit.id == split.id)
        .options(selectinload(ExpenseSplit.parts))
    )
    result = await db.execute(stmt)
    split = result.scalar_one()
    return _to_dict(split)


@router.put("/{split_id}/settle")
async def settle_expense_split(
    split_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Marcar divisão como liquidada."""
    require_permission(ctx, "can_add_transactions")
    family_id = await _get_user_family_id(db, user.id)
    split = await _get_or_404(db, split_id, family_id)
    split.is_settled = True
    split.settled_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(split)
    stmt = (
        select(ExpenseSplit)
        .where(ExpenseSplit.id == split.id)
        .options(selectinload(ExpenseSplit.parts))
    )
    result = await db.execute(stmt)
    split = result.scalar_one()
    return _to_dict(split)


@router.put("/{split_id}/parts/{part_id}/settle")
async def settle_expense_split_part(
    split_id: uuid.UUID,
    part_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Marcar parcela individual como paga."""
    require_permission(ctx, "can_add_transactions")
    family_id = await _get_user_family_id(db, user.id)
    split = await _get_or_404(db, split_id, family_id)

    part = next((p for p in split.parts if p.id == part_id), None) if hasattr(split, "parts") else None
    if not part:
        stmt = select(ExpenseSplitPart).where(
            ExpenseSplitPart.id == part_id, ExpenseSplitPart.split_id == split_id
        )
        result = await db.execute(stmt)
        part = result.scalar_one_or_none()

    if not part:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Parcela não encontrada"},
        )

    part.is_paid = True
    part.paid_at = datetime.now(UTC)
    await db.flush()

    # Check if all parts are now paid → auto-settle the split
    stmt = select(ExpenseSplitPart).where(
        ExpenseSplitPart.split_id == split_id, ExpenseSplitPart.is_paid.is_(False)
    )
    result = await db.execute(stmt)
    if not result.scalars().first():
        split.is_settled = True
        split.settled_at = datetime.now(UTC)
        await db.flush()

    # Reload full split
    stmt = (
        select(ExpenseSplit)
        .where(ExpenseSplit.id == split_id)
        .options(selectinload(ExpenseSplit.parts))
    )
    result = await db.execute(stmt)
    split = result.scalar_one()
    return _to_dict(split)


@router.delete("/{split_id}", status_code=204)
async def delete_expense_split(
    split_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_add_transactions")
    family_id = await _get_user_family_id(db, user.id)
    split = await _get_or_404(db, split_id, family_id)
    await db.delete(split)


async def _get_or_404(
    db: AsyncSession, split_id: uuid.UUID, family_id: uuid.UUID | None
) -> ExpenseSplit:
    if not family_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Divisão de despesa não encontrada"},
        )
    stmt = select(ExpenseSplit).where(
        ExpenseSplit.id == split_id, ExpenseSplit.family_id == family_id
    )
    result = await db.execute(stmt)
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Divisão de despesa não encontrada"},
        )
    return split


def _to_dict(split: ExpenseSplit) -> dict:
    return {
        "id": split.id,
        "family_id": split.family_id,
        "transaction_id": split.transaction_id,
        "description": split.description,
        "total_amount": split.total_amount,
        "split_type": split.split_type,
        "is_settled": split.is_settled,
        "settled_at": split.settled_at,
        "notes": split.notes,
        "parts": [
            {
                "id": p.id,
                "member_id": p.member_id,
                "amount": p.amount,
                "percentage": p.percentage,
                "is_paid": p.is_paid,
                "paid_at": p.paid_at,
            }
            for p in split.parts
        ],
        "created_at": split.created_at,
        "updated_at": split.updated_at,
    }
