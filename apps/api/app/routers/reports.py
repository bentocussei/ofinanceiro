"""Reports router: spending by category, income vs expense summary."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.category import Category
from app.models.enums import TransactionType
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
