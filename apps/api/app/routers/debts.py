"""Debts router: CRUD + payments + simulation."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.user import User
from app.schemas.debt import DebtCreate, DebtUpdate, PaymentCreate
from app.services.debt import (
    create_debt,
    delete_debt,
    get_debt,
    list_debts,
    register_payment,
    simulate_payoff,
    update_debt,
)

router = APIRouter(prefix="/api/v1/debts", tags=["debts"])


def _serialize_debt(d) -> dict:
    return {
        "id": str(d.id), "name": d.name, "type": d.type, "creditor": d.creditor,
        "original_amount": d.original_amount,
        "current_balance": d.current_balance,
        "remaining_balance": d.current_balance,
        "interest_rate": d.interest_rate,
        "monthly_payment": d.monthly_payment,
        "minimum_payment": d.monthly_payment or 0,
        "payment_day": d.payment_day,
        "due_day": d.payment_day,
        "status": "paid_off" if getattr(d, 'is_paid_off', False) else "active",
        "is_active": d.is_active,
        "start_date": str(d.start_date) if d.start_date else None,
        "expected_end_date": str(d.expected_end_date) if d.expected_end_date else None,
        "notes": d.notes,
        "nature": d.nature, "creditor_type": d.creditor_type,
        "linked_account_id": str(d.linked_account_id) if d.linked_account_id else None,
        "auto_pay_enabled": d.auto_pay_enabled,
        "payments_count": len(d.payments) if hasattr(d, 'payments') and d.payments else 0,
    }


@router.get("/")
async def list_debts_endpoint(
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    debts = await list_debts(db, user.id, active_only=False, family_id=ctx.family_id)

    # Apply cursor pagination
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        debts = [d for d in debts if d.id < cursor_uuid]
    debts = debts[:limit + 1]

    next_cursor = None
    if len(debts) > limit:
        debts = debts[:limit]
        next_cursor = str(debts[-1].id)

    return {
        "items": [_serialize_debt(d) for d in debts],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.post("/", status_code=201)
async def create_debt_endpoint(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("debts:manage:create"),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    debt = await create_debt(db, user.id, data, family_id=ctx.family_id)
    return {
        "id": str(debt.id), "name": debt.name,
        "nature": debt.nature, "creditor_type": debt.creditor_type,
    }


@router.put("/{debt_id}")
async def update_debt_endpoint(
    debt_id: uuid.UUID,
    data: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    debt = await get_debt(db, debt_id, user.id, family_id=ctx.family_id)
    if not debt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Dívida não encontrada")
    debt = await update_debt(db, debt, data)
    return _serialize_debt(debt)


@router.post("/{debt_id}/payment", status_code=201)
async def register_payment_endpoint(
    debt_id: uuid.UUID,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("debts:payment:create"),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    debt = await get_debt(db, debt_id, user.id, family_id=ctx.family_id)
    if not debt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Dívida não encontrada")

    # Verify account ownership if provided
    if data.from_account_id:
        from sqlalchemy import select
        from app.models.account import Account
        result = await db.execute(
            select(Account).where(Account.id == data.from_account_id, Account.user_id == user.id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")

    return await register_payment(db, user.id, debt, data)


@router.get("/simulate")
async def simulate_acceleration(
    current_balance: int,
    monthly_payment: int,
    interest_rate: int = 0,
    extra_payment: int = 0,
) -> dict:
    """Simulate debt payoff with optional extra monthly payment."""
    return simulate_payoff(current_balance, monthly_payment, interest_rate, extra_payment)


@router.delete("/{debt_id}", status_code=204)
async def delete_debt_endpoint(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_add_transactions")
    debt = await get_debt(db, debt_id, user.id, family_id=ctx.family_id)
    if not debt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Dívida não encontrada")
    await delete_debt(db, debt)
