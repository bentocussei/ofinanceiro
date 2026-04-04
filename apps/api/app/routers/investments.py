"""Investments router: CRUD + performance + simulation + portfolio analytics."""

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
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
    get_investment,
    list_investments,
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
async def get_performance(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    base_stmt = select(
        func.sum(Investment.invested_amount).label("total_invested"),
        func.sum(Investment.current_value).label("total_value"),
    ).where(Investment.is_active.is_(True))
    if ctx.is_family:
        base_stmt = base_stmt.where(Investment.family_id == ctx.family_id)
    else:
        base_stmt = base_stmt.where(Investment.user_id == user.id, Investment.family_id.is_(None))
    result = await db.execute(base_stmt)
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


@router.get("/allocation")
async def get_allocation(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Portfolio allocation breakdown by investment type."""
    investments = await list_investments(db, user.id, family_id=ctx.family_id)

    total_value = sum(i.current_value for i in investments)

    by_type: dict[str, dict] = {}
    for inv in investments:
        entry = by_type.setdefault(inv.type, {"invested": 0, "current_value": 0, "count": 0})
        entry["invested"] += inv.invested_amount
        entry["current_value"] += inv.current_value
        entry["count"] += 1

    allocation = []
    concentration_warning: str | None = None
    for inv_type, data in sorted(by_type.items(), key=lambda x: -x[1]["current_value"]):
        pct = round(data["current_value"] / total_value * 100, 1) if total_value > 0 else 0
        label = TYPE_LABELS.get(inv_type, inv_type.capitalize())
        allocation.append({
            "type": inv_type, "label": label,
            "invested": data["invested"], "current_value": data["current_value"],
            "percentage": pct, "count": data["count"],
        })
        if pct > 60:
            concentration_warning = f"Mais de 60% concentrado em {label}"

    return {
        "total_invested": sum(i.invested_amount for i in investments),
        "total_current_value": total_value,
        "allocation": allocation,
        "concentration_warning": concentration_warning,
    }


@router.get("/performance-history")
async def get_performance_history(
    months: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Monthly performance snapshots."""
    investments = await list_investments(db, user.id, family_id=ctx.family_id)
    today = date.today()

    month_data: dict[str, dict] = {}
    for m in range(months - 1, -1, -1):
        y = today.year
        mo = today.month - m
        while mo <= 0:
            mo += 12
            y -= 1
        period = f"{y}-{mo:02d}"
        month_data[period] = {"invested": 0, "value": 0}

    periods = sorted(month_data.keys())

    for inv in investments:
        start = inv.start_date or today
        total_days = max((today - start).days, 1)

        for period in periods:
            p_year, p_month = int(period[:4]), int(period[5:])
            if p_month == 12:
                period_end = date(p_year + 1, 1, 1) - timedelta(days=1)
            else:
                period_end = date(p_year, p_month + 1, 1) - timedelta(days=1)

            if period_end < start:
                continue

            elapsed = min((period_end - start).days, total_days)
            fraction = elapsed / total_days
            interpolated_value = int(
                inv.invested_amount + (inv.current_value - inv.invested_amount) * fraction
            )

            month_data[period]["invested"] += inv.invested_amount
            month_data[period]["value"] += interpolated_value

    result_months = []
    for period in periods:
        d = month_data[period]
        return_pct = (
            round((d["value"] - d["invested"]) / d["invested"] * 100, 1)
            if d["invested"] > 0 else 0
        )
        result_months.append({"period": period, "invested": d["invested"], "value": d["value"], "return_pct": return_pct})

    return {"months": result_months}


@router.get("/insights")
async def get_insights(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Investment insights (rule-based)."""
    investments = await list_investments(db, user.id, family_id=ctx.family_id)
    today = date.today()

    insights: list[dict] = []
    total_value = sum(i.current_value for i in investments)
    total_invested = sum(i.invested_amount for i in investments)

    by_type: dict[str, int] = {}
    for inv in investments:
        by_type[inv.type] = by_type.get(inv.type, 0) + inv.current_value

    max_pct = 0.0
    max_type = ""
    for inv_type, value in by_type.items():
        pct = (value / total_value * 100) if total_value > 0 else 0
        if pct > max_pct:
            max_pct = pct
            max_type = inv_type

    if max_pct > 60 and len(by_type) > 1:
        label = TYPE_LABELS.get(max_type, max_type.capitalize())
        insights.append({"type": "diversification", "severity": "warning", "title": "Concentração elevada",
                         "description": f"Mais de {int(max_pct)}% do portfolio está em {label.lower()}.", "recommendation": "Explore outros tipos de investimento."})
    elif len(by_type) == 1 and investments:
        label = TYPE_LABELS.get(max_type, max_type.capitalize())
        insights.append({"type": "diversification", "severity": "critical", "title": "Sem diversificação",
                         "description": f"Todo o portfolio está em {label.lower()}.", "recommendation": "Diversifique entre depósitos, obrigações e outros."})

    for inv in investments:
        if inv.maturity_date:
            days = (inv.maturity_date - today).days
            if 0 < days <= 30:
                insights.append({"type": "maturity", "severity": "info", "title": "Investimento a vencer",
                                 "description": f"{inv.name} vence em {days} dias.", "recommendation": "Avalie renovação ou realocação."})
            elif days <= 0:
                insights.append({"type": "maturity", "severity": "warning", "title": "Investimento vencido",
                                 "description": f"{inv.name} já venceu.", "recommendation": "Verifique com a instituição."})

    if total_invested > 0 and total_value < total_invested:
        loss_pct = round((total_invested - total_value) / total_invested * 100, 1)
        insights.append({"type": "performance", "severity": "warning", "title": "Retorno negativo",
                         "description": f"Perda de {loss_pct}%.", "recommendation": "Avalie investimentos com pior desempenho."})

    num_types = len(by_type)
    if num_types == 0:
        diversification_score = 0
    else:
        herfindahl = sum((v / total_value * 100) ** 2 for v in by_type.values()) if total_value > 0 else 10000
        h_max = 10000
        h_min = 10000 / max(num_types, 1)
        diversification_score = int(100 * (1 - (herfindahl - h_min) / (h_max - h_min))) if h_max > h_min else 100
        diversification_score = max(0, min(100, diversification_score))

    risky_types = {"stock", "crypto"}
    conservative_types = {"deposit", "savings", "bond"}
    risky_pct = sum(by_type.get(t, 0) for t in risky_types) / total_value * 100 if total_value > 0 else 0
    conservative_pct = sum(by_type.get(t, 0) for t in conservative_types) / total_value * 100 if total_value > 0 else 100
    if risky_pct > 50:
        risk_profile = "agressivo"
    elif conservative_pct > 70:
        risk_profile = "conservador"
    else:
        risk_profile = "moderado"

    return {"insights": insights, "ai_generated": False, "risk_profile": risk_profile, "diversification_score": diversification_score}


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
