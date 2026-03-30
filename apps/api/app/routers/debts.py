"""Debts router: CRUD + payments + amortization + simulation."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import get_current_user
from app.models.debt import Debt, DebtPayment
from app.models.user import User

router = APIRouter(prefix="/api/v1/debts", tags=["debts"])


class DebtCreate(BaseModel):
    name: str = Field(max_length=100)
    type: str
    creditor: str | None = None
    original_amount: int = Field(gt=0)
    current_balance: int | None = None
    interest_rate: int | None = None  # basis points
    monthly_payment: int | None = None
    payment_day: int | None = Field(None, ge=1, le=31)
    start_date: str | None = None
    expected_end_date: str | None = None
    notes: str | None = None
    nature: str | None = None
    creditor_type: str | None = None
    creditor_name: str | None = None
    linked_account_id: uuid.UUID | None = None
    auto_pay_enabled: bool | None = None


class DebtUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    type: str | None = None
    creditor: str | None = None
    original_amount: int | None = Field(None, gt=0)
    current_balance: int | None = Field(None, gt=0)
    interest_rate: int | None = None
    monthly_payment: int | None = None
    payment_day: int | None = Field(None, ge=1, le=31)
    start_date: str | None = None
    expected_end_date: str | None = None
    notes: str | None = None
    nature: str | None = None
    creditor_type: str | None = None
    linked_account_id: uuid.UUID | None = None
    auto_pay_enabled: bool | None = None


class PaymentCreate(BaseModel):
    amount: int = Field(gt=0)
    payment_date: str


@router.get("/")
async def list_debts(
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    stmt = select(Debt).where(Debt.user_id == user.id)
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Debt.id < cursor_uuid)
    stmt = stmt.order_by(Debt.created_at.desc(), Debt.id.desc())
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    debts = list(result.scalars().unique().all())

    next_cursor = None
    if len(debts) > limit:
        debts = debts[:limit]
        next_cursor = str(debts[-1].id)

    items = [
        {
            "id": str(d.id), "name": d.name, "type": d.type, "creditor": d.creditor,
            "original_amount": d.original_amount,
            "current_balance": d.current_balance,
            "remaining_balance": d.current_balance,  # alias for frontend compat
            "interest_rate": d.interest_rate,
            "monthly_payment": d.monthly_payment,
            "minimum_payment": d.monthly_payment or 0,  # alias for frontend compat
            "payment_day": d.payment_day,
            "due_day": d.payment_day,  # alias for frontend compat
            "status": "paid_off" if getattr(d, 'is_paid_off', False) else "active",
            "is_active": d.is_active,
            "start_date": str(d.start_date) if d.start_date else None,
            "expected_end_date": str(d.expected_end_date) if d.expected_end_date else None,
            "notes": d.notes,
            "nature": d.nature, "creditor_type": d.creditor_type,
            "linked_account_id": str(d.linked_account_id) if d.linked_account_id else None,
            "auto_pay_enabled": d.auto_pay_enabled,
            "payments_count": len(d.payments),
        }
        for d in debts
    ]

    return {
        "items": items,
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.post("/", status_code=201)
async def create_debt(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    current_balance = data.current_balance if data.current_balance is not None else data.original_amount
    kwargs = {
        "user_id": user.id, "name": data.name, "type": data.type,
        "creditor": data.creditor or data.creditor_name,
        "original_amount": data.original_amount, "current_balance": current_balance,
        "interest_rate": data.interest_rate, "monthly_payment": data.monthly_payment,
        "payment_day": data.payment_day, "notes": data.notes,
    }
    if data.nature:
        kwargs["nature"] = data.nature
    if data.creditor_type:
        kwargs["creditor_type"] = data.creditor_type
    if data.start_date:
        kwargs["start_date"] = data.start_date
    if data.expected_end_date:
        kwargs["expected_end_date"] = data.expected_end_date
    if data.linked_account_id:
        kwargs["linked_account_id"] = data.linked_account_id
    if data.auto_pay_enabled is not None:
        kwargs["auto_pay_enabled"] = data.auto_pay_enabled
    debt = Debt(**kwargs)
    db.add(debt)
    await db.flush()
    return {
        "id": str(debt.id), "name": debt.name,
        "nature": debt.nature, "creditor_type": debt.creditor_type,
    }


@router.put("/{debt_id}")
async def update_debt(
    debt_id: uuid.UUID,
    data: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    result = await db.execute(select(Debt).where(Debt.id == debt_id, Debt.user_id == user.id))
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Dívida não encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(debt, field, value)
    await db.flush()
    return {
        "id": str(debt.id), "name": debt.name, "type": debt.type, "creditor": debt.creditor,
        "original_amount": debt.original_amount, "current_balance": debt.current_balance,
        "interest_rate": debt.interest_rate, "monthly_payment": debt.monthly_payment,
        "payment_day": debt.payment_day, "is_active": debt.is_active,
        "start_date": str(debt.start_date) if debt.start_date else None,
        "expected_end_date": str(debt.expected_end_date) if debt.expected_end_date else None,
        "notes": debt.notes,
        "nature": debt.nature, "creditor_type": debt.creditor_type,
        "linked_account_id": str(debt.linked_account_id) if debt.linked_account_id else None,
        "auto_pay_enabled": debt.auto_pay_enabled,
    }


@router.post("/{debt_id}/payment", status_code=201)
async def register_payment(
    debt_id: uuid.UUID,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    result = await db.execute(select(Debt).where(Debt.id == debt_id, Debt.user_id == user.id))
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    payment = DebtPayment(debt_id=debt.id, amount=data.amount, payment_date=data.payment_date)
    db.add(payment)
    debt.current_balance = max(0, debt.current_balance - data.amount)
    if debt.current_balance == 0:
        debt.is_active = False
    await db.flush()
    return {"success": True, "remaining_balance": debt.current_balance}


@router.get("/simulate")
async def simulate_acceleration(
    current_balance: int,
    monthly_payment: int,
    interest_rate: int = 0,  # basis points
    extra_payment: int = 0,
) -> dict:
    """Simulate debt payoff with optional extra monthly payment."""
    if monthly_payment <= 0:
        return {"error": "Prestação deve ser positiva"}

    total_payment = monthly_payment + extra_payment
    monthly_rate = (interest_rate / 10000) / 12

    # Without extra
    balance = current_balance
    months_normal = 0
    total_paid_normal = 0
    while balance > 0 and months_normal < 600:
        interest = int(balance * monthly_rate)
        principal = monthly_payment - interest
        if principal <= 0:
            return {"error": "Prestação não cobre os juros"}
        balance = max(0, balance - principal)
        total_paid_normal += monthly_payment
        months_normal += 1

    # With extra
    balance = current_balance
    months_extra = 0
    total_paid_extra = 0
    while balance > 0 and months_extra < 600:
        interest = int(balance * monthly_rate)
        principal = total_payment - interest
        if principal <= 0:
            return {"error": "Pagamento não cobre os juros"}
        balance = max(0, balance - principal)
        total_paid_extra += total_payment
        months_extra += 1

    savings = total_paid_normal - total_paid_extra
    months_saved = months_normal - months_extra

    return {
        "without_extra": {"months": months_normal, "total_paid": total_paid_normal},
        "with_extra": {"months": months_extra, "total_paid": total_paid_extra},
        "savings": savings,
        "months_saved": months_saved,
    }


@router.delete("/{debt_id}", status_code=204)
async def delete_debt(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_add_transactions")
    result = await db.execute(select(Debt).where(Debt.id == debt_id, Debt.user_id == user.id))
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(debt)
    await db.flush()
