"""Transactions router: CRUD with filters and pagination.

# TODO: Add get_context dependency for family permission checks
# When migrated to get_context:
#   - POST (create): require_permission(ctx, "can_add_transactions")
#   - PUT (update): require_permission(ctx, "can_add_transactions")
#   - DELETE: require_permission(ctx, "can_add_transactions")
#   - GET (list/get): always allowed (read access)
"""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilter,
    TransactionResponse,
    TransactionUpdate,
)
from app.services import transaction as txn_service

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.get("/")
async def list_transactions(
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    txn_type: TransactionType | None = Query(None, alias="type"),
    date_from: date | None = None,
    date_to: date | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
    search: str | None = None,
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    filters = TransactionFilter(
        account_id=account_id,
        category_id=category_id,
        type=txn_type,
        date_from=date_from,
        date_to=date_to,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
    )

    transactions, next_cursor = await txn_service.list_transactions(
        db, user.id, filters, cursor, limit
    )

    return {
        "items": [TransactionResponse.model_validate(t) for t in transactions],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.get("/monthly-summary")
async def monthly_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Resumo do mês corrente: receitas, despesas e gastos por categoria."""
    first_day = date.today().replace(day=1)
    today = date.today()

    # Income vs Expense totals
    type_stmt = (
        select(
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= first_day,
            Transaction.transaction_date <= today,
        )
        .group_by(Transaction.type)
    )
    type_result = await db.execute(type_stmt)
    totals = {"income": 0, "expense": 0}
    for row in type_result.all():
        if row.type in totals:
            totals[row.type] = row.total

    # Spending by category (expenses only)
    cat_stmt = (
        select(
            Category.name,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= first_day,
            Transaction.transaction_date <= today,
        )
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(10)
    )
    cat_result = await db.execute(cat_stmt)
    categories = cat_result.all()

    total_expense = totals["expense"] or 1  # avoid division by zero
    by_category = [
        {
            "category": row.name,
            "amount": row.total,
            "count": row.count,
            "percentage": round((row.total / total_expense) * 100, 1),
        }
        for row in categories
    ]

    return {
        "income": totals["income"],
        "expense": totals["expense"],
        "balance": totals["income"] - totals["expense"],
        "by_category": by_category,
    }


@router.get("/{txn_id}", response_model=TransactionResponse)
async def get_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionResponse:
    txn = await txn_service.get_transaction(db, txn_id, user.id)
    if not txn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Transacção não encontrada"})
    return TransactionResponse.model_validate(txn)


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionResponse:
    txn = await txn_service.create_transaction(db, user.id, data)
    return TransactionResponse.model_validate(txn)


@router.put("/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: uuid.UUID,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionResponse:
    txn = await txn_service.get_transaction(db, txn_id, user.id)
    if not txn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Transacção não encontrada"})
    updated = await txn_service.update_transaction(db, txn, data)
    return TransactionResponse.model_validate(updated)


@router.delete("/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    txn = await txn_service.get_transaction(db, txn_id, user.id)
    if not txn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Transacção não encontrada"})
    await txn_service.delete_transaction(db, txn)
