"""Reports router: spending by category, income vs expense summary, patrimony."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context
from app.database import get_db
from app.dependencies import get_current_user
from app.models.account import Account
from app.models.asset import Asset
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
    ctx: FinanceContext = Depends(get_context),
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
        .join(Account, Transaction.account_id == Account.id)
        .where(
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
    )
    if ctx.is_family:
        stmt = stmt.where(Account.family_id == ctx.family_id)
    else:
        stmt = stmt.where(Transaction.user_id == user.id, Account.family_id.is_(None))
    stmt = (
        stmt
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
    ctx: FinanceContext = Depends(get_context),
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
        .join(Account, Transaction.account_id == Account.id)
        .where(
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
    )
    if ctx.is_family:
        stmt = stmt.where(Account.family_id == ctx.family_id)
    else:
        stmt = stmt.where(Transaction.user_id == user.id, Account.family_id.is_(None))
    stmt = stmt.group_by(Transaction.type)

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
    ctx: FinanceContext = Depends(get_context),
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
        Account.is_archived.is_(False),
        Account.type.in_(asset_account_types),
    )
    if ctx.is_family:
        asset_accounts_stmt = asset_accounts_stmt.where(Account.family_id == ctx.family_id)
    else:
        asset_accounts_stmt = asset_accounts_stmt.where(Account.user_id == user.id, Account.family_id.is_(None))
    asset_accounts = list((await db.execute(asset_accounts_stmt)).scalars().all())
    accounts_total = sum(a.balance for a in asset_accounts)

    # --- Active investments ---
    # The Investment model has family_id, and the create endpoint sets it from
    # ctx.family_id, so investments CAN be family-scoped. The previous code
    # filtered by user_id only, which leaked personal investments into the
    # family report and hid family investments owned by other members.
    investments_stmt = select(Investment).where(Investment.is_active.is_(True))
    if ctx.is_family:
        investments_stmt = investments_stmt.where(Investment.family_id == ctx.family_id)
    else:
        investments_stmt = investments_stmt.where(
            Investment.user_id == user.id, Investment.family_id.is_(None)
        )
    investments = list((await db.execute(investments_stmt)).scalars().all())
    investments_total = sum(inv.current_value for inv in investments)

    # --- Savings goals (active only) ---
    goals_stmt = select(Goal).where(Goal.status == GoalStatus.ACTIVE)
    if ctx.is_family:
        goals_stmt = goals_stmt.where(Goal.family_id == ctx.family_id)
    else:
        goals_stmt = goals_stmt.where(Goal.user_id == user.id, Goal.family_id.is_(None))
    goals_list = list((await db.execute(goals_stmt)).scalars().all())
    savings_total = sum(g.current_amount for g in goals_list)

    # --- Physical assets ---
    physical_assets_stmt = select(Asset).where(Asset.is_active.is_(True))
    if ctx.is_family:
        physical_assets_stmt = physical_assets_stmt.where(Asset.family_id == ctx.family_id)
    else:
        physical_assets_stmt = physical_assets_stmt.where(Asset.user_id == user.id, Asset.family_id.is_(None))
    physical_assets = list((await db.execute(physical_assets_stmt)).scalars().all())
    physical_assets_total = sum(a.current_value for a in physical_assets)

    # --- Active debts ---
    # Same fix as investments above: Debt.family_id is supported by the model
    # and set by create_debt; the report must respect the current context.
    debts_stmt = select(Debt).where(Debt.is_active.is_(True))
    if ctx.is_family:
        debts_stmt = debts_stmt.where(Debt.family_id == ctx.family_id)
    else:
        debts_stmt = debts_stmt.where(
            Debt.user_id == user.id, Debt.family_id.is_(None)
        )
    debts = list((await db.execute(debts_stmt)).scalars().all())
    debts_total = sum(d.current_balance for d in debts)

    # --- Credit / loan accounts (liabilities) ---
    credit_accounts_stmt = select(Account).where(
        Account.is_archived.is_(False),
        Account.type.in_(liability_account_types),
    )
    if ctx.is_family:
        credit_accounts_stmt = credit_accounts_stmt.where(Account.family_id == ctx.family_id)
    else:
        credit_accounts_stmt = credit_accounts_stmt.where(Account.user_id == user.id, Account.family_id.is_(None))
    credit_accounts = list((await db.execute(credit_accounts_stmt)).scalars().all())
    credit_total = sum(abs(a.balance) for a in credit_accounts)

    total_assets = accounts_total + investments_total + savings_total + physical_assets_total
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
            "physical_assets": {
                "total": physical_assets_total,
                "items": [
                    {
                        "name": a.name,
                        "current_value": a.current_value,
                        "type": a.type,
                    }
                    for a in physical_assets
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
