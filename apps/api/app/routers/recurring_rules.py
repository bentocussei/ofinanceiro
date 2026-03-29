"""Recurring Rules router: CRUD para regras de transacções recorrentes."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.recurring_rule import RecurringRule
from app.models.user import User

router = APIRouter(prefix="/api/v1/recurring-rules", tags=["recurring-rules"])


@router.get("/")
async def list_recurring_rules(
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(RecurringRule).where(RecurringRule.user_id == user.id)
    if is_active is not None:
        stmt = stmt.where(RecurringRule.is_active == is_active)
    stmt = stmt.order_by(RecurringRule.next_due.asc().nulls_last())
    result = await db.execute(stmt)
    rules = result.scalars().all()
    return [_to_dict(r) for r in rules]


@router.post("/", status_code=201)
async def create_recurring_rule(
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rule = RecurringRule(user_id=user.id, **data)
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return _to_dict(rule)


@router.put("/{rule_id}")
async def update_recurring_rule(
    rule_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rule = await _get_or_404(db, rule_id, user.id)
    for key, value in data.items():
        if hasattr(rule, key):
            setattr(rule, key, value)
    await db.flush()
    await db.refresh(rule)
    return _to_dict(rule)


@router.delete("/{rule_id}", status_code=204)
async def delete_recurring_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    rule = await _get_or_404(db, rule_id, user.id)
    await db.delete(rule)


async def _get_or_404(db: AsyncSession, rule_id: uuid.UUID, user_id: uuid.UUID) -> RecurringRule:
    stmt = select(RecurringRule).where(RecurringRule.id == rule_id, RecurringRule.user_id == user_id)
    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Regra recorrente não encontrada"},
        )
    return rule


def _to_dict(rule: RecurringRule) -> dict:
    return {
        "id": rule.id,
        "user_id": rule.user_id,
        "account_id": rule.account_id,
        "category_id": rule.category_id,
        "type": rule.type,
        "amount": rule.amount,
        "description": rule.description,
        "frequency": rule.frequency,
        "day_of_month": rule.day_of_month,
        "day_of_week": rule.day_of_week,
        "start_date": rule.start_date,
        "end_date": rule.end_date,
        "is_active": rule.is_active,
        "last_processed": rule.last_processed,
        "next_due": rule.next_due,
        "created_at": rule.created_at,
        "updated_at": rule.updated_at,
    }
