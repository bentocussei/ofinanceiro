"""Transactions router: CRUD with filters and pagination."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
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


def _serialize(txn: Transaction) -> TransactionResponse:
    """Build a TransactionResponse with denormalized account_name and
    category_name. Requires the transaction to have its `account` and
    `category` relationships eagerly loaded by the caller."""
    response = TransactionResponse.model_validate(txn)
    # account is a non-null relationship, but we still defend against it
    # being unloaded in unexpected paths.
    try:
        if txn.account is not None:
            response.account_name = txn.account.name
    except Exception:
        response.account_name = None
    try:
        if txn.category is not None:
            response.category_name = txn.category.name
    except Exception:
        response.category_name = None
    return response


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
    ctx: FinanceContext = Depends(get_context),
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
        db, user.id, filters, cursor, limit, family_id=ctx.family_id
    )

    return {
        "items": [_serialize(t) for t in transactions],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.get("/monthly-summary")
async def monthly_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    """Resumo do mês corrente: receitas, despesas e gastos por categoria."""
    from app.models.account import Account

    first_day = date.today().replace(day=1)
    today = date.today()

    # Income vs Expense totals
    type_stmt = (
        select(
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Account, Transaction.account_id == Account.id)
        .where(
            Transaction.transaction_date >= first_day,
            Transaction.transaction_date <= today,
        )
    )
    if ctx.is_family:
        type_stmt = type_stmt.where(Account.family_id == ctx.family_id)
    else:
        type_stmt = type_stmt.where(Transaction.user_id == user.id, Account.family_id.is_(None))
    type_stmt = type_stmt.group_by(Transaction.type)

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
        .join(Account, Transaction.account_id == Account.id)
        .where(
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= first_day,
            Transaction.transaction_date <= today,
        )
    )
    if ctx.is_family:
        cat_stmt = cat_stmt.where(Account.family_id == ctx.family_id)
    else:
        cat_stmt = cat_stmt.where(Transaction.user_id == user.id, Account.family_id.is_(None))
    cat_stmt = (
        cat_stmt
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(10)
    )
    cat_result = await db.execute(cat_stmt)
    categories = cat_result.all()

    total_expense = totals["expense"] or 1  # avoid division by zero
    by_category = [
        {
            "category_name": row.name,
            "amount": row.total,
            "count": row.count,
            "percentage": round((row.total / total_expense) * 100, 1),
        }
        for row in categories
    ]

    # Spending by member (for family context)
    by_member: list[dict] = []
    if ctx.is_family:
        from app.models.user import User as UserModel

        from sqlalchemy import case

        member_stmt = (
            select(
                UserModel.name.label("member_name"),
                func.sum(
                    case(
                        (Transaction.type == TransactionType.INCOME, Transaction.amount),
                        else_=0,
                    )
                ).label("income"),
                func.sum(
                    case(
                        (Transaction.type == TransactionType.EXPENSE, Transaction.amount),
                        else_=0,
                    )
                ).label("expense"),
            )
            .join(Account, Transaction.account_id == Account.id)
            .join(UserModel, Transaction.user_id == UserModel.id)
            .where(
                Account.family_id == ctx.family_id,
                Transaction.transaction_date >= first_day,
                Transaction.transaction_date <= today,
            )
            .group_by(UserModel.name)
        )
        member_result = await db.execute(member_stmt)
        by_member = [
            {"member_name": row.member_name, "income": row.income, "expense": row.expense}
            for row in member_result.all()
        ]

    return {
        "income": totals["income"],
        "expense": totals["expense"],
        "balance": totals["income"] - totals["expense"],
        "by_category": by_category,
        "by_member": by_member,
    }


@router.get("/{txn_id}", response_model=TransactionResponse)
async def get_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> TransactionResponse:
    txn = await txn_service.get_transaction(db, txn_id, user.id, family_id=ctx.family_id)
    if not txn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Transacção não encontrada"})
    return _serialize(txn)


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("transactions:manage:create"),
) -> TransactionResponse:
    require_permission(ctx, "can_add_transactions")
    txn = await txn_service.create_transaction(db, user.id, data, family_id=ctx.family_id)
    # Re-fetch with relationships eager-loaded so the response includes
    # account_name and category_name without triggering lazy loads.
    fresh = await txn_service.get_transaction(db, txn.id, user.id, family_id=ctx.family_id)
    return _serialize(fresh or txn)


@router.put("/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: uuid.UUID,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("transactions:manage:update"),
) -> TransactionResponse:
    require_permission(ctx, "can_add_transactions")
    txn = await txn_service.get_transaction(db, txn_id, user.id, family_id=ctx.family_id)
    if not txn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Transacção não encontrada"})
    await txn_service.update_transaction(db, txn, data)
    fresh = await txn_service.get_transaction(db, txn_id, user.id, family_id=ctx.family_id)
    return _serialize(fresh or txn)


@router.delete("/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("transactions:manage:delete"),
) -> None:
    require_permission(ctx, "can_add_transactions")
    txn = await txn_service.get_transaction(db, txn_id, user.id, family_id=ctx.family_id)
    if not txn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Transacção não encontrada"})
    await txn_service.delete_transaction(db, txn)
