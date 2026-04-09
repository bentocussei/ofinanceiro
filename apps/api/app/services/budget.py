"""Budget service: CRUD, status calculation, and suggestions."""

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.budget import Budget, BudgetItem
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.schemas.budget import (
    BudgetCreate,
    BudgetItemStatus,
    BudgetStatusResponse,
    BudgetUpdate,
)


async def list_budgets(
    db: AsyncSession,
    user_id: uuid.UUID,
    active_only: bool = True,
    cursor: str | None = None,
    limit: int = 50,
    family_id: uuid.UUID | None = None,
) -> tuple[list[Budget], str | None]:
    """List budgets with cursor-based pagination.
    Returns (budgets, next_cursor).
    """
    stmt = select(Budget)
    if family_id is not None:
        stmt = stmt.where(Budget.family_id == family_id)
    else:
        stmt = stmt.where(Budget.user_id == user_id, Budget.family_id.is_(None))
    if active_only:
        stmt = stmt.where(Budget.is_active.is_(True))
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Budget.id < cursor_uuid)
    stmt = stmt.order_by(Budget.created_at.desc(), Budget.id.desc())
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    budgets = list(result.scalars().unique().all())

    next_cursor = None
    if len(budgets) > limit:
        budgets = budgets[:limit]
        next_cursor = str(budgets[-1].id)

    return budgets, next_cursor


async def get_budget(
    db: AsyncSession,
    budget_id: uuid.UUID,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Budget | None:
    stmt = select(Budget).where(Budget.id == budget_id)
    if family_id is not None:
        stmt = stmt.where(Budget.family_id == family_id)
    else:
        stmt = stmt.where(Budget.user_id == user_id, Budget.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_budget(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: BudgetCreate,
    family_id: uuid.UUID | None = None,
) -> Budget:
    budget = Budget(
        user_id=user_id,
        family_id=family_id,
        name=data.name,
        method=data.method,
        period_type=data.period_type,
        period_start=data.period_start,
        period_end=data.period_end,
        total_limit=data.total_limit,
        rollover=data.rollover,
    )
    db.add(budget)
    await db.flush()

    for item_data in data.items:
        item = BudgetItem(
            budget_id=budget.id,
            category_id=item_data.category_id,
            limit_amount=item_data.limit_amount,
        )
        db.add(item)

    await db.flush()
    await db.refresh(budget, ["items"])
    return budget


async def update_budget(db: AsyncSession, budget: Budget, data: BudgetUpdate) -> Budget:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    await db.flush()
    await db.refresh(budget, ["items"])
    return budget


async def delete_budget(db: AsyncSession, budget: Budget) -> None:
    await db.delete(budget)
    await db.flush()


async def get_budget_status(
    db: AsyncSession, budget: Budget
) -> BudgetStatusResponse:
    """Calculate actual spending vs limits for each budget item."""
    days_remaining = max(0, (budget.period_end - date.today()).days)

    item_statuses = []
    total_limit = 0
    total_spent = 0

    for item in budget.items:
        # Get spending for this category in the budget period.
        #
        # IMPORTANT: spending is scoped via Account, not via Transaction.user_id.
        # A family budget must aggregate every family member's transactions on
        # accounts that belong to the family. Filtering by Transaction.user_id
        # alone (the previous behaviour) silently hid every other member's
        # spending and made the "spent" total wrong for shared budgets.
        stmt = (
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .join(Account, Transaction.account_id == Account.id)
            .where(
                Transaction.category_id == item.category_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= budget.period_start,
                Transaction.transaction_date <= budget.period_end,
            )
        )
        if budget.family_id is not None:
            stmt = stmt.where(Account.family_id == budget.family_id)
        else:
            stmt = stmt.where(
                Account.user_id == budget.user_id,
                Account.family_id.is_(None),
            )
        result = await db.execute(stmt)
        spent = result.scalar() or 0

        effective_limit = item.limit_amount + item.rollover_amount
        remaining = effective_limit - spent
        pct = round((spent / effective_limit * 100) if effective_limit > 0 else 0, 1)

        # Get category info
        cat_result = await db.execute(
            select(Category.name, Category.icon).where(Category.id == item.category_id)
        )
        cat = cat_result.one_or_none()

        item_statuses.append(BudgetItemStatus(
            category_id=item.category_id,
            category_name=cat.name if cat else "Desconhecida",
            category_icon=cat.icon if cat else None,
            limit_amount=effective_limit,
            spent=spent,
            remaining=remaining,
            percentage=pct,
        ))

        total_limit += effective_limit
        total_spent += spent

    budget_total_limit = budget.total_limit or total_limit
    total_remaining = budget_total_limit - total_spent
    total_pct = round((total_spent / budget_total_limit * 100) if budget_total_limit > 0 else 0, 1)

    return BudgetStatusResponse(
        budget_id=budget.id,
        name=budget.name,
        method=budget.method,
        period_start=budget.period_start,
        period_end=budget.period_end,
        days_remaining=days_remaining,
        total_limit=budget_total_limit,
        total_spent=total_spent,
        total_remaining=total_remaining,
        percentage=total_pct,
        items=item_statuses,
    )
