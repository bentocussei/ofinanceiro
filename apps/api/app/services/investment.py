"""Investment service — business rules for investment tracking.

Contains all logic previously inline in routers/investments.py.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.investment import Investment
from app.schemas.investment import InvestmentCreate, InvestmentUpdate


async def list_investments(
    db: AsyncSession, user_id: uuid.UUID, active_only: bool = True,
    family_id: uuid.UUID | None = None,
) -> list[Investment]:
    """List investments with context-aware filtering."""
    if family_id:
        query = select(Investment).where(Investment.family_id == family_id)
    else:
        query = select(Investment).where(Investment.user_id == user_id, Investment.family_id.is_(None))
    if active_only:
        query = query.where(Investment.is_active.is_(True))
    query = query.order_by(Investment.current_value.desc())
    result = await db.scalars(query)
    return list(result.all())


async def get_investment(
    db: AsyncSession, investment_id: uuid.UUID, user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Investment | None:
    """Get a single investment by ID."""
    if family_id:
        stmt = select(Investment).where(Investment.id == investment_id, Investment.family_id == family_id)
    else:
        stmt = select(Investment).where(Investment.id == investment_id, Investment.user_id == user_id, Investment.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_investment(
    db: AsyncSession, user_id: uuid.UUID, data: InvestmentCreate,
    family_id: uuid.UUID | None = None,
) -> Investment:
    """Create a new investment.

    If from_account_id is provided, debits the account.
    """
    interest_rate = data.get_interest_rate_bp()

    investment = Investment(
        user_id=user_id,
        family_id=family_id,
        name=data.name,
        type=data.type,
        institution=data.institution,
        invested_amount=data.invested_amount,
        current_value=data.current_value,
        interest_rate=interest_rate,
        notes=data.notes,
    )
    if data.start_date:
        investment.start_date = data.start_date
    if data.maturity_date:
        investment.maturity_date = data.maturity_date

    # Debit source account if provided
    if data.from_account_id:
        account = await db.get(Account, data.from_account_id)
        if account and account.user_id == user_id:
            account.balance -= data.invested_amount

    db.add(investment)
    await db.flush()
    return investment


async def update_investment(
    db: AsyncSession, investment: Investment, data: InvestmentUpdate,
) -> Investment:
    """Update an investment."""
    update_data = data.model_dump(exclude_unset=True)

    # Handle annual_return_rate → interest_rate conversion
    if "annual_return_rate" in update_data:
        bp = data.get_interest_rate_bp()
        if bp is not None:
            investment.interest_rate = bp
        del update_data["annual_return_rate"]

    for field, value in update_data.items():
        setattr(investment, field, value)

    await db.flush()
    return investment


async def delete_investment(db: AsyncSession, investment: Investment) -> None:
    """Delete an investment."""
    await db.delete(investment)
    await db.flush()


# ---------------------------------------------------------------------------
# Analytics & Simulation (moved from router)
# ---------------------------------------------------------------------------

TYPE_LABELS: dict[str, str] = {
    "deposit": "Depósitos a prazo",
    "bond": "Obrigações",
    "stock": "Acções",
    "fund": "Fundos de investimento",
    "crypto": "Criptomoedas",
    "real_estate": "Imobiliário",
    "savings": "Poupança",
    "fixed_income": "Renda fixa",
    "other": "Outros",
}


async def get_performance(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID | None = None,
) -> dict:
    """Total portfolio performance."""
    from sqlalchemy import func
    stmt = select(
        func.sum(Investment.invested_amount).label("total_invested"),
        func.sum(Investment.current_value).label("total_value"),
    ).where(Investment.is_active.is_(True))
    if family_id:
        stmt = stmt.where(Investment.family_id == family_id)
    else:
        stmt = stmt.where(Investment.user_id == user_id, Investment.family_id.is_(None))
    result = await db.execute(stmt)
    row = result.one()
    invested = row.total_invested or 0
    value = row.total_value or 0
    return {
        "total_invested": invested,
        "total_value": value,
        "total_return": value - invested,
        "return_pct": round((value - invested) / invested * 100, 1) if invested > 0 else 0,
    }


def simulate_compound(
    principal: int, monthly_contribution: int = 0,
    annual_rate_bp: int = 1200, months: int = 60,
) -> dict:
    """Simulate compound interest growth. Pure calculation, no DB."""
    monthly_rate = (annual_rate_bp / 10000) / 12
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


async def get_allocation(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID | None = None,
) -> dict:
    """Portfolio allocation breakdown by investment type."""
    investments = await list_investments(db, user_id, family_id=family_id)
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


async def get_insights(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID | None = None,
) -> dict:
    """Investment insights (rule-based)."""
    from datetime import date as _date
    investments = await list_investments(db, user_id, family_id=family_id)
    today = _date.today()

    insights: list[dict] = []
    total_value = sum(i.current_value for i in investments)
    total_invested = sum(i.invested_amount for i in investments)

    by_type: dict[str, int] = {}
    for inv in investments:
        by_type[inv.type] = by_type.get(inv.type, 0) + inv.current_value

    # Concentration
    max_pct, max_type = 0.0, ""
    for inv_type, value in by_type.items():
        pct = (value / total_value * 100) if total_value > 0 else 0
        if pct > max_pct:
            max_pct, max_type = pct, inv_type

    if max_pct > 60 and len(by_type) > 1:
        label = TYPE_LABELS.get(max_type, max_type.capitalize())
        insights.append({"type": "diversification", "severity": "warning", "title": "Concentração elevada",
                         "description": f"Mais de {int(max_pct)}% em {label.lower()}.", "recommendation": "Diversifique."})
    elif len(by_type) == 1 and investments:
        label = TYPE_LABELS.get(max_type, max_type.capitalize())
        insights.append({"type": "diversification", "severity": "critical", "title": "Sem diversificação",
                         "description": f"Todo o portfolio em {label.lower()}.", "recommendation": "Diversifique."})

    # Maturity
    for inv in investments:
        if inv.maturity_date:
            days = (inv.maturity_date - today).days
            if 0 < days <= 30:
                insights.append({"type": "maturity", "severity": "info", "title": "A vencer",
                                 "description": f"{inv.name} vence em {days} dias.", "recommendation": "Avalie renovação."})
            elif days <= 0:
                insights.append({"type": "maturity", "severity": "warning", "title": "Vencido",
                                 "description": f"{inv.name} já venceu.", "recommendation": "Verifique com a instituição."})

    # Negative return
    if total_invested > 0 and total_value < total_invested:
        loss_pct = round((total_invested - total_value) / total_invested * 100, 1)
        insights.append({"type": "performance", "severity": "warning", "title": "Retorno negativo",
                         "description": f"Perda de {loss_pct}%.", "recommendation": "Avalie investimentos com pior desempenho."})

    # Diversification score
    num_types = len(by_type)
    if num_types == 0:
        diversification_score = 0
    else:
        herfindahl = sum((v / total_value * 100) ** 2 for v in by_type.values()) if total_value > 0 else 10000
        h_max, h_min = 10000, 10000 / max(num_types, 1)
        diversification_score = int(100 * (1 - (herfindahl - h_min) / (h_max - h_min))) if h_max > h_min else 100
        diversification_score = max(0, min(100, diversification_score))

    # Risk profile
    risky_pct = sum(by_type.get(t, 0) for t in {"stock", "crypto"}) / total_value * 100 if total_value > 0 else 0
    conservative_pct = sum(by_type.get(t, 0) for t in {"deposit", "savings", "bond"}) / total_value * 100 if total_value > 0 else 100
    if risky_pct > 50:
        risk_profile = "agressivo"
    elif conservative_pct > 70:
        risk_profile = "conservador"
    else:
        risk_profile = "moderado"

    return {"insights": insights, "ai_generated": False, "risk_profile": risk_profile, "diversification_score": diversification_score}


async def get_performance_history(
    db: AsyncSession, user_id: uuid.UUID,
    months: int = 12, family_id: uuid.UUID | None = None,
) -> dict:
    """Monthly performance snapshots with linear interpolation."""
    from datetime import date as _date, timedelta

    investments = await list_investments(db, user_id, family_id=family_id)
    today = _date.today()

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
                period_end = _date(p_year + 1, 1, 1) - timedelta(days=1)
            else:
                period_end = _date(p_year, p_month + 1, 1) - timedelta(days=1)

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
        return_pct = round((d["value"] - d["invested"]) / d["invested"] * 100, 1) if d["invested"] > 0 else 0
        result_months.append({"period": period, "invested": d["invested"], "value": d["value"], "return_pct": return_pct})

    return {"months": result_months}
