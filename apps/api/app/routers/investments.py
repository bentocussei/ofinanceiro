"""Investments router: CRUD + performance + simulation + portfolio analytics."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.investment import Investment
from app.models.user import User
from app.schemas.investment import InvestmentCreate, InvestmentUpdate
from app.services.investment import (
    create_investment,
    delete_investment,
    get_allocation,
    get_insights,
    get_investment,
    get_performance,
    list_investments,
    simulate_compound,
    update_investment,
)

router = APIRouter(prefix="/api/v1/investments", tags=["investments"])

# Labels in Portuguese for investment types
TYPE_LABELS: dict[str, str] = {
    "deposit": "Depósitos a prazo",
    "bond": "Obrigações",
    "stock": "Acções",
    "fund": "Fundos de investimento",
    "crypto": "Criptomoedas",
    "real_estate": "Imobiliário",
    "savings": "Poupança",
    "other": "Outros",
}


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


def _serialize_investment(i: Investment) -> dict:
    """Serialize an investment to dict, including annual_return_rate."""
    return {
        "id": str(i.id),
        "name": i.name,
        "type": i.type,
        "institution": i.institution,
        "invested_amount": i.invested_amount,
        "current_value": i.current_value,
        "interest_rate": i.interest_rate,
        "annual_return_rate": (i.interest_rate or 0) / 100,
        "is_active": i.is_active,
        "start_date": str(i.start_date) if i.start_date else None,
        "maturity_date": str(i.maturity_date) if i.maturity_date else None,
        "notes": i.notes,
        "return_pct": round(
            (i.current_value - i.invested_amount) / i.invested_amount * 100, 1
        )
        if i.invested_amount > 0
        else 0,
    }


@router.get("/")
async def list_investments_endpoint(
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    investments = await list_investments(db, user.id, active_only=False, family_id=ctx.family_id)

    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        investments = [i for i in investments if i.id < cursor_uuid]
    investments = investments[:limit + 1]

    next_cursor = None
    if len(investments) > limit:
        investments = investments[:limit]
        next_cursor = str(investments[-1].id)

    return {
        "items": [_serialize_investment(i) for i in investments],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.get("/performance")
async def get_performance_endpoint(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    return await get_performance(db, user.id, family_id=ctx.family_id)


@router.post("/", status_code=201)
async def create_investment_endpoint(
    data: InvestmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("investments:manage:create"),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    inv = await create_investment(db, user.id, data, family_id=ctx.family_id)
    return {"id": str(inv.id), "name": inv.name}


@router.put("/{investment_id}")
async def update_investment_endpoint(
    investment_id: uuid.UUID,
    data: InvestmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    inv = await get_investment(db, investment_id, user.id, family_id=ctx.family_id)
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Investimento não encontrado")
    inv = await update_investment(db, inv, data)
    return _serialize_investment(inv)


@router.get("/simulate")
async def simulate_compound_interest(
    principal: int,
    monthly_contribution: int = 0,
    annual_rate: int = 1200,
    months: int = 60,
) -> dict:
    """Simulate compound interest growth."""
    return simulate_compound(principal, monthly_contribution, annual_rate, months)


@router.get("/allocation")
async def get_allocation_endpoint(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Portfolio allocation breakdown by investment type."""
    return await get_allocation(db, user.id, family_id=ctx.family_id)


@router.get("/performance-history")
async def get_performance_history(
    months: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Monthly performance snapshots (linear interpolation)."""
    from app.services.investment import get_performance_history as _get_history
    return await _get_history(db, user.id, months=months, family_id=ctx.family_id)


@router.get("/insights")
async def get_insights_endpoint(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Investment insights (rule-based)."""
    return await get_insights(db, user.id, family_id=ctx.family_id)


@router.post("/ask")
async def ask_investment_question(data: AskRequest, user: User = Depends(get_current_user)) -> dict:
    return {"answer": "Esta funcionalidade estará disponível em breve com integração IA.", "ai_generated": False}


@router.delete("/{investment_id}", status_code=204)
async def delete_investment_endpoint(
    investment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_add_transactions")
    inv = await get_investment(db, investment_id, user.id, family_id=ctx.family_id)
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Investimento não encontrado")
    await delete_investment(db, inv)
