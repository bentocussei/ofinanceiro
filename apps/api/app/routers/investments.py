"""Investments router: CRUD + performance + compound interest simulation."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.investment import Investment
from app.models.user import User

router = APIRouter(prefix="/api/v1/investments", tags=["investments"])


class InvestmentCreate(BaseModel):
    name: str = Field(max_length=100)
    type: str = Field(max_length=50)
    institution: str | None = None
    invested_amount: int = Field(gt=0)
    current_value: int = Field(gt=0)
    interest_rate: int | None = None  # basis points
    start_date: str | None = None
    maturity_date: str | None = None
    notes: str | None = None


class InvestmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    type: str | None = Field(None, max_length=50)
    institution: str | None = None
    invested_amount: int | None = Field(None, gt=0)
    current_value: int | None = Field(None, gt=0)
    interest_rate: int | None = None
    start_date: str | None = None
    maturity_date: str | None = None
    notes: str | None = None
    is_active: bool | None = None


@router.get("/")
async def list_investments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    result = await db.execute(
        select(Investment).where(Investment.user_id == user.id).order_by(Investment.created_at.desc())
    )
    investments = result.scalars().all()
    return [
        {
            "id": str(i.id), "name": i.name, "type": i.type, "institution": i.institution,
            "invested_amount": i.invested_amount, "current_value": i.current_value,
            "interest_rate": i.interest_rate, "is_active": i.is_active,
            "start_date": str(i.start_date) if i.start_date else None,
            "maturity_date": str(i.maturity_date) if i.maturity_date else None,
            "notes": i.notes,
            "return_pct": round((i.current_value - i.invested_amount) / i.invested_amount * 100, 1) if i.invested_amount > 0 else 0,
        }
        for i in investments
    ]


@router.get("/performance")
async def get_performance(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(
            func.sum(Investment.invested_amount).label("total_invested"),
            func.sum(Investment.current_value).label("total_value"),
        ).where(Investment.user_id == user.id, Investment.is_active.is_(True))
    )
    row = result.one()
    invested = row.total_invested or 0
    value = row.total_value or 0
    return {
        "total_invested": invested,
        "total_value": value,
        "total_return": value - invested,
        "return_pct": round((value - invested) / invested * 100, 1) if invested > 0 else 0,
    }


@router.post("/", status_code=201)
async def create_investment(
    data: InvestmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    inv = Investment(
        user_id=user.id, name=data.name, type=data.type, institution=data.institution,
        invested_amount=data.invested_amount, current_value=data.current_value,
        interest_rate=data.interest_rate, start_date=data.start_date,
        maturity_date=data.maturity_date, notes=data.notes,
    )
    db.add(inv)
    await db.flush()
    return {"id": str(inv.id), "name": inv.name}


@router.put("/{investment_id}")
async def update_investment(
    investment_id: uuid.UUID,
    data: InvestmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Investment).where(Investment.id == investment_id, Investment.user_id == user.id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Investimento não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inv, field, value)
    await db.flush()
    return {
        "id": str(inv.id), "name": inv.name, "type": inv.type, "institution": inv.institution,
        "invested_amount": inv.invested_amount, "current_value": inv.current_value,
        "interest_rate": inv.interest_rate, "is_active": inv.is_active,
        "start_date": str(inv.start_date) if inv.start_date else None,
        "maturity_date": str(inv.maturity_date) if inv.maturity_date else None,
        "notes": inv.notes,
        "return_pct": round((inv.current_value - inv.invested_amount) / inv.invested_amount * 100, 1) if inv.invested_amount > 0 else 0,
    }


@router.get("/simulate")
async def simulate_compound_interest(
    principal: int,
    monthly_contribution: int = 0,
    annual_rate: int = 1200,  # basis points (12%)
    months: int = 60,
) -> dict:
    """Simulate compound interest growth."""
    monthly_rate = (annual_rate / 10000) / 12
    balance = principal

    projections = []
    for month in range(1, months + 1):
        interest = int(balance * monthly_rate)
        balance += interest + monthly_contribution
        if month % 12 == 0 or month == months:
            projections.append({"month": month, "balance": balance})

    total_contributed = principal + monthly_contribution * months
    total_interest = balance - total_contributed

    return {
        "final_balance": balance,
        "total_contributed": total_contributed,
        "total_interest": total_interest,
        "projections": projections,
    }


@router.delete("/{investment_id}", status_code=204)
async def delete_investment(
    investment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Investment).where(Investment.id == investment_id, Investment.user_id == user.id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(inv)
    await db.flush()
