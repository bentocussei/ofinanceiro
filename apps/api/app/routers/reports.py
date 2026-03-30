"""Reports router: spending by category, income vs expense summary, patrimony."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.account import Account
from app.models.category import Category
from app.models.debt import Debt
from app.models.enums import AccountType, GoalStatus, TransactionType
from app.models.goal import Goal
from app.models.investment import Investment
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/spending-by-category")
async def spending_by_category(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    """Get expense totals grouped by category for a date range."""
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    stmt = (
        select(
            Category.id,
            Category.name,
            Category.icon,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
        .group_by(Category.id, Category.name, Category.icon)
        .order_by(func.sum(Transaction.amount).desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "category_id": str(row.id),
            "category_name": row.name,
            "category_icon": row.icon,
            "total": row.total,
            "count": row.count,
        }
        for row in rows
    ]


@router.get("/income-expense-summary")
async def income_expense_summary(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get income vs expense totals for a date range."""
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    stmt = (
        select(
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
        .group_by(Transaction.type)
    )

    result = await db.execute(stmt)
    rows = result.all()

    summary = {"income": 0, "expense": 0, "transfer": 0, "income_count": 0, "expense_count": 0}
    for row in rows:
        summary[row.type] = row.total
        summary[f"{row.type}_count"] = row.count

    summary["balance"] = summary["income"] - summary["expense"]

    return summary


@router.get("/patrimony")
async def get_patrimony(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Calcula o património líquido agregando contas, investimentos, metas e dívidas."""

    asset_account_types = {
        AccountType.BANK,
        AccountType.CASH,
        AccountType.SAVINGS,
        AccountType.DIGITAL_WALLET,
    }
    liability_account_types = {AccountType.CREDIT_CARD, AccountType.LOAN}

    # --- Asset accounts ---
    asset_accounts_stmt = select(Account).where(
        Account.user_id == user.id,
        Account.is_archived.is_(False),
        Account.type.in_(asset_account_types),
    )
    asset_accounts = list((await db.execute(asset_accounts_stmt)).scalars().all())
    accounts_total = sum(a.balance for a in asset_accounts)

    # --- Active investments ---
    investments_stmt = select(Investment).where(
        Investment.user_id == user.id,
        Investment.is_active.is_(True),
    )
    investments = list((await db.execute(investments_stmt)).scalars().all())
    investments_total = sum(inv.current_value for inv in investments)

    # --- Savings goals (active only) ---
    goals_stmt = select(Goal).where(
        Goal.user_id == user.id,
        Goal.status == GoalStatus.ACTIVE,
    )
    goals_list = list((await db.execute(goals_stmt)).scalars().all())
    savings_total = sum(g.current_amount for g in goals_list)

    # --- Active debts ---
    debts_stmt = select(Debt).where(
        Debt.user_id == user.id,
        Debt.is_active.is_(True),
    )
    debts = list((await db.execute(debts_stmt)).scalars().all())
    debts_total = sum(d.current_balance for d in debts)

    # --- Credit / loan accounts (liabilities) ---
    credit_accounts_stmt = select(Account).where(
        Account.user_id == user.id,
        Account.is_archived.is_(False),
        Account.type.in_(liability_account_types),
    )
    credit_accounts = list((await db.execute(credit_accounts_stmt)).scalars().all())
    credit_total = sum(abs(a.balance) for a in credit_accounts)

    total_assets = accounts_total + investments_total + savings_total
    total_liabilities = debts_total + credit_total
    net_worth = total_assets - total_liabilities

    return {
        "net_worth": net_worth,
        "assets": {
            "total": total_assets,
            "accounts": {
                "total": accounts_total,
                "items": [
                    {"name": a.name, "balance": a.balance, "type": a.type}
                    for a in asset_accounts
                ],
            },
            "investments": {
                "total": investments_total,
                "items": [
                    {
                        "name": inv.name,
                        "current_value": inv.current_value,
                        "type": inv.type,
                    }
                    for inv in investments
                ],
            },
            "savings_goals": {
                "total": savings_total,
                "items": [
                    {"name": g.name, "current_amount": g.current_amount}
                    for g in goals_list
                ],
            },
        },
        "liabilities": {
            "total": total_liabilities,
            "debts": {
                "total": debts_total,
                "items": [
                    {
                        "name": d.name,
                        "current_balance": d.current_balance,
                        "type": d.type,
                    }
                    for d in debts
                ],
            },
            "credit_accounts": {
                "total": credit_total,
                "items": [
                    {
                        "name": a.name,
                        "balance": a.balance,
                        "type": a.type,
                    }
                    for a in credit_accounts
                ],
            },
        },
    }
