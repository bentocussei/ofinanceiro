"""Debts router: CRUD + payments + amortization + simulation."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
    current_balance: int = Field(gt=0)
    interest_rate: int | None = None  # basis points
    monthly_payment: int | None = None
    payment_day: int | None = Field(None, ge=1, le=31)
    notes: str | None = None


class PaymentCreate(BaseModel):
    amount: int = Field(gt=0)
    payment_date: str


@router.get("/")
async def list_debts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    result = await db.execute(
        select(Debt).where(Debt.user_id == user.id).order_by(Debt.created_at.desc())
    )
    debts = result.scalars().unique().all()
    return [
        {
            "id": str(d.id), "name": d.name, "type": d.type, "creditor": d.creditor,
            "original_amount": d.original_amount, "current_balance": d.current_balance,
            "interest_rate": d.interest_rate, "monthly_payment": d.monthly_payment,
            "payment_day": d.payment_day, "is_active": d.is_active,
            "payments_count": len(d.payments),
        }
        for d in debts
    ]


@router.post("/", status_code=201)
async def create_debt(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    debt = Debt(
        user_id=user.id, name=data.name, type=data.type, creditor=data.creditor,
        original_amount=data.original_amount, current_balance=data.current_balance,
        interest_rate=data.interest_rate, monthly_payment=data.monthly_payment,
        payment_day=data.payment_day, notes=data.notes,
    )
    db.add(debt)
    await db.flush()
    return {"id": str(debt.id), "name": debt.name}


@router.post("/{debt_id}/payment", status_code=201)
async def register_payment(
    debt_id: uuid.UUID,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
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
) -> None:
    result = await db.execute(select(Debt).where(Debt.id == debt_id, Debt.user_id == user.id))
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(debt)
    await db.flush()
