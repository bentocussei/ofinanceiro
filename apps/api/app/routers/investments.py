"""Investments router: CRUD + performance + compound interest simulation + portfolio analytics."""

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import get_current_user
from app.models.investment import Investment
from app.models.user import User

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


class InvestmentCreate(BaseModel):
    name: str = Field(max_length=100)
    type: str = Field(max_length=50)
    institution: str | None = None
    invested_amount: int = Field(gt=0)
    current_value: int = Field(gt=0)
    interest_rate: int | None = None  # basis points (kept for backward compat)
    annual_return_rate: float | None = None  # percentage e.g. 12.5 means 12.5%
    start_date: str | None = None
    maturity_date: str | None = None
    notes: str | None = None

    def get_interest_rate_bp(self) -> int | None:
        """Return interest rate in basis points, preferring annual_return_rate if provided."""
        if self.annual_return_rate is not None:
            return int(self.annual_return_rate * 100)
        return self.interest_rate


class InvestmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    type: str | None = Field(None, max_length=50)
    institution: str | None = None
    invested_amount: int | None = Field(None, gt=0)
    current_value: int | None = Field(None, gt=0)
    interest_rate: int | None = None
    annual_return_rate: float | None = None  # percentage
    start_date: str | None = None
    maturity_date: str | None = None
    notes: str | None = None
    is_active: bool | None = None

    def get_interest_rate_bp(self) -> int | None:
        """Return interest rate in basis points, preferring annual_return_rate if provided."""
        if self.annual_return_rate is not None:
            return int(self.annual_return_rate * 100)
        return self.interest_rate


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
async def list_investments(
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    stmt = select(Investment).where(Investment.user_id == user.id)
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Investment.id < cursor_uuid)
    stmt = stmt.order_by(Investment.created_at.desc(), Investment.id.desc())
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    investments = list(result.scalars().all())

    next_cursor = None
    if len(investments) > limit:
        investments = investments[:limit]
        next_cursor = str(investments[-1].id)

    items = [_serialize_investment(i) for i in investments]

    return {
        "items": items,
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


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
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    inv = Investment(
        user_id=user.id, name=data.name, type=data.type, institution=data.institution,
        invested_amount=data.invested_amount, current_value=data.current_value,
        interest_rate=data.get_interest_rate_bp(), start_date=data.start_date,
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
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_add_transactions")
    result = await db.execute(
        select(Investment).where(Investment.id == investment_id, Investment.user_id == user.id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Investimento não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    # Convert annual_return_rate to basis points if provided
    if "annual_return_rate" in update_data:
        update_data["interest_rate"] = data.get_interest_rate_bp()
        del update_data["annual_return_rate"]
    for field, value in update_data.items():
        setattr(inv, field, value)
    await db.flush()
    return _serialize_investment(inv)


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


@router.get("/allocation")
async def get_allocation(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Portfolio allocation breakdown by investment type."""
    result = await db.execute(
        select(Investment).where(
            Investment.user_id == user.id, Investment.is_active.is_(True)
        )
    )
    investments = list(result.scalars().all())

    total_invested = sum(i.invested_amount for i in investments)
    total_current = sum(i.current_value for i in investments)

    # Group by type
    by_type: dict[str, dict] = {}
    for inv in investments:
        entry = by_type.setdefault(
            inv.type, {"invested": 0, "current_value": 0, "count": 0}
        )
        entry["invested"] += inv.invested_amount
        entry["current_value"] += inv.current_value
        entry["count"] += 1

    allocation = []
    concentration_warning: str | None = None
    for inv_type, data in sorted(by_type.items(), key=lambda x: -x[1]["current_value"]):
        pct = round(data["current_value"] / total_current * 100, 1) if total_current > 0 else 0
        label = TYPE_LABELS.get(inv_type, inv_type.capitalize())
        allocation.append({
            "type": inv_type,
            "label": label,
            "invested": data["invested"],
            "current_value": data["current_value"],
            "percentage": pct,
            "count": data["count"],
        })
        if pct > 60:
            concentration_warning = f"Mais de 60% concentrado em {label}"

    return {
        "total_invested": total_invested,
        "total_current_value": total_current,
        "allocation": allocation,
        "concentration_warning": concentration_warning,
    }


@router.get("/performance-history")
async def get_performance_history(
    months: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Monthly performance snapshots (linear interpolation from start_date to now)."""
    result = await db.execute(
        select(Investment).where(
            Investment.user_id == user.id, Investment.is_active.is_(True)
        )
    )
    investments = list(result.scalars().all())
    today = date.today()

    # Build monthly buckets
    month_data: dict[str, dict] = {}
    for m in range(months - 1, -1, -1):
        # Go back m months
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
        # Days from start to today
        total_days = max((today - start).days, 1)

        for period in periods:
            # Parse period into date (last day of month)
            p_year, p_month = int(period[:4]), int(period[5:])
            if p_month == 12:
                period_end = date(p_year + 1, 1, 1) - timedelta(days=1)
            else:
                period_end = date(p_year, p_month + 1, 1) - timedelta(days=1)

            if period_end < start:
                # Investment didn't exist yet
                continue

            # Linear interpolation of value growth
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
            if d["invested"] > 0
            else 0
        )
        result_months.append({
            "period": period,
            "invested": d["invested"],
            "value": d["value"],
            "return_pct": return_pct,
        })

    return {"months": result_months}


@router.get("/insights")
async def get_insights(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """AI-ready investment insights. Currently rule-based, later enhanced by AI agent."""
    result = await db.execute(
        select(Investment).where(
            Investment.user_id == user.id, Investment.is_active.is_(True)
        )
    )
    investments = list(result.scalars().all())
    today = date.today()

    insights: list[dict] = []
    total_value = sum(i.current_value for i in investments)
    total_invested = sum(i.invested_amount for i in investments)

    # --- Concentration analysis ---
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
        insights.append({
            "type": "diversification",
            "severity": "warning",
            "title": "Concentração elevada",
            "description": f"Mais de {int(max_pct)}% do portfolio está em {label.lower()}. Considere diversificar.",
            "recommendation": "Explore outros tipos de investimento para reduzir risco.",
        })
    elif len(by_type) == 1 and len(investments) > 0:
        label = TYPE_LABELS.get(max_type, max_type.capitalize())
        insights.append({
            "type": "diversification",
            "severity": "critical",
            "title": "Sem diversificação",
            "description": f"Todo o portfolio está em {label.lower()}.",
            "recommendation": "Diversifique entre depósitos a prazo, obrigações e outros instrumentos.",
        })

    # --- Maturity alerts ---
    for inv in investments:
        if inv.maturity_date:
            days_to_maturity = (inv.maturity_date - today).days
            if 0 < days_to_maturity <= 30:
                insights.append({
                    "type": "maturity",
                    "severity": "info",
                    "title": "Investimento a vencer",
                    "description": f"{inv.name} vence em {days_to_maturity} dias.",
                    "recommendation": "Avalie se quer renovar ou realocar o capital.",
                })
            elif days_to_maturity <= 0:
                insights.append({
                    "type": "maturity",
                    "severity": "warning",
                    "title": "Investimento vencido",
                    "description": f"{inv.name} já venceu.",
                    "recommendation": "Verifique com a instituição o estado do investimento.",
                })

    # --- Negative return alert ---
    if total_invested > 0 and total_value < total_invested:
        loss_pct = round((total_invested - total_value) / total_invested * 100, 1)
        insights.append({
            "type": "performance",
            "severity": "warning",
            "title": "Retorno negativo",
            "description": f"O portfolio está com uma perda de {loss_pct}%.",
            "recommendation": "Avalie os investimentos com pior desempenho.",
        })

    # --- Diversification score (0-100) ---
    num_types = len(by_type)
    if num_types == 0:
        diversification_score = 0
    else:
        # Herfindahl-based: lower concentration = higher score
        herfindahl = sum(
            (v / total_value * 100) ** 2 for v in by_type.values()
        ) if total_value > 0 else 10000
        # Perfect concentration = 10000, perfect spread among N types = 10000/N
        # Normalize: score = 100 * (1 - (H - H_min) / (H_max - H_min))
        h_max = 10000  # single type
        h_min = 10000 / max(num_types, 1)
        if h_max > h_min:
            diversification_score = int(100 * (1 - (herfindahl - h_min) / (h_max - h_min)))
        else:
            diversification_score = 100 if num_types >= 1 else 0
        diversification_score = max(0, min(100, diversification_score))

    # --- Risk profile ---
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

    return {
        "insights": insights,
        "ai_generated": False,
        "risk_profile": risk_profile,
        "diversification_score": diversification_score,
    }


@router.post("/ask")
async def ask_investment_question(
    data: AskRequest,
    user: User = Depends(get_current_user),
) -> dict:
    """AI chatbot for investment questions. Placeholder for AI integration."""
    return {
        "answer": "Esta funcionalidade estará disponível em breve com integração IA.",
        "ai_generated": False,
    }


@router.delete("/{investment_id}", status_code=204)
async def delete_investment(
    investment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_add_transactions")
    result = await db.execute(
        select(Investment).where(Investment.id == investment_id, Investment.user_id == user.id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(inv)
    await db.flush()
