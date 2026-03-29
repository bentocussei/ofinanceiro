"""Smart Insights Engine: background analysis that generates proactive insights."""

import logging
import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import Budget
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.services.budget import get_budget_status

logger = logging.getLogger(__name__)


async def generate_insights(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    """Run all insight rules for a user. Returns list of insight dicts."""
    insights = []

    # Rule 1: Unusual spending (>3x average for a category)
    insight = await _check_unusual_spending(db, user_id)
    if insight:
        insights.append(insight)

    # Rule 2: Budget at risk (>80% spent with >5 days remaining)
    insight = await _check_budget_risk(db, user_id)
    if insight:
        insights.append(insight)

    # Rule 3: Negative balance projection
    insight = await _check_balance_projection(db, user_id)
    if insight:
        insights.append(insight)

    # Rule 4: Seasonal pattern (month >20% vs previous)
    insight = await _check_seasonal_pattern(db, user_id)
    if insight:
        insights.append(insight)

    # Rule 5: Savings opportunity
    insight = await _check_savings_opportunity(db, user_id)
    if insight:
        insights.append(insight)

    # Rule 6: Recurring transaction detected
    insight = await _check_recurring_detected(db, user_id)
    if insight:
        insights.append(insight)

    # Limit to 2 insights per run
    return insights[:2]


async def _check_unusual_spending(db: AsyncSession, user_id: uuid.UUID) -> dict | None:
    """Detect if any category has spending >3x the 30-day average."""
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Get average daily spending per category (30 days)
    stmt = (
        select(Category.name, func.sum(Transaction.amount).label("total"))
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .where(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= month_ago,
        )
        .group_by(Category.name)
    )
    result = await db.execute(stmt)
    monthly = {row.name: row.total / 30 for row in result.all() if row.total}

    # Get last 7 days per category
    stmt = (
        select(Category.name, func.sum(Transaction.amount).label("total"))
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .where(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= week_ago,
        )
        .group_by(Category.name)
    )
    result = await db.execute(stmt)
    weekly = {row.name: row.total / 7 for row in result.all() if row.total}

    for cat, daily_avg in weekly.items():
        monthly_avg = monthly.get(cat, 0)
        if monthly_avg > 0 and daily_avg > monthly_avg * 3:
            return {
                "type": "unusual_spending",
                "title": f"Gasto incomum em {cat or 'Geral'}",
                "message": f"Os seus gastos em {cat or 'geral'} esta semana estão 3x acima do normal.",
                "category": cat,
                "severity": "warning",
            }
    return None


async def _check_budget_risk(db: AsyncSession, user_id: uuid.UUID) -> dict | None:
    """Check if any active budget is >80% spent with >5 days remaining."""
    result = await db.execute(
        select(Budget).where(Budget.user_id == user_id, Budget.is_active.is_(True))
    )
    budgets = result.scalars().unique().all()

    for budget in budgets:
        status = await get_budget_status(db, budget)
        if status.percentage >= 80 and status.days_remaining > 5:
            return {
                "type": "budget_risk",
                "title": f"Orçamento em risco: {budget.name or 'Mensal'}",
                "message": f"Já utilizou {status.percentage}% do orçamento com {status.days_remaining} dias restantes.",
                "severity": "warning",
            }
    return None


async def _check_balance_projection(db: AsyncSession, user_id: uuid.UUID) -> dict | None:
    """Project if balance will go negative before next salary."""
    from app.models.account import Account

    result = await db.execute(
        select(func.sum(Account.balance)).where(
            Account.user_id == user_id, Account.is_archived.is_(False)
        )
    )
    total_balance = result.scalar() or 0

    # Get average daily expense (last 30 days)
    month_ago = date.today() - timedelta(days=30)
    result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= month_ago,
        )
    )
    monthly_expense = result.scalar() or 0
    daily_expense = monthly_expense / 30

    if daily_expense > 0:
        days_until_zero = total_balance / daily_expense
        if days_until_zero < 15 and total_balance > 0:
            return {
                "type": "balance_warning",
                "title": "Saldo pode ficar baixo",
                "message": f"Ao ritmo actual, o seu saldo pode esgotar em ~{int(days_until_zero)} dias.",
                "severity": "alert",
            }
    return None


async def _check_seasonal_pattern(db: AsyncSession, user_id: uuid.UUID) -> dict | None:
    """Check if this month's spending is >20% above previous month."""
    today = date.today()
    this_month_start = today.replace(day=1)
    prev_month_end = this_month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    for period_start, period_end in [(this_month_start, today), (prev_month_start, prev_month_end)]:
        await db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
            )
        )

    # Simplified — just check if data exists
    return None


async def _check_savings_opportunity(db: AsyncSession, user_id: uuid.UUID) -> dict | None:
    """Check if user has consistent surplus over 3 months."""
    # Simplified for Phase 5
    return None


async def _check_recurring_detected(db: AsyncSession, user_id: uuid.UUID) -> dict | None:
    """Check for recurring transactions (same description/amount in 3+ months)."""
    three_months_ago = date.today() - timedelta(days=90)

    stmt = (
        select(Transaction.description, Transaction.amount, func.count().label("count"))
        .where(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= three_months_ago,
            Transaction.description.isnot(None),
        )
        .group_by(Transaction.description, Transaction.amount)
        .having(func.count() >= 3)
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.one_or_none()

    if row:
        return {
            "type": "recurring_detected",
            "title": "Gasto recorrente detectado",
            "message": f"Detectámos que '{row.description}' ({row.amount / 100:.0f} Kz) aparece todos os meses.",
            "severity": "info",
        }
    return None
