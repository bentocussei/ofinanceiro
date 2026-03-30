"""Transaction service: CRUD with filters and cursor pagination."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionFilter, TransactionUpdate


async def list_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    filters: TransactionFilter | None = None,
    cursor: str | None = None,
    limit: int = 50,
    family_id: uuid.UUID | None = None,
) -> tuple[list[Transaction], str | None]:
    """List transactions with filters and cursor-based pagination.
    Returns (transactions, next_cursor).

    Context filtering:
    - family_id=None (personal): transactions on accounts where family_id IS NULL
    - family_id=<uuid> (family): transactions on accounts with matching family_id
    """
    stmt = select(Transaction).join(Account, Transaction.account_id == Account.id)
    if family_id is not None:
        stmt = stmt.where(Account.family_id == family_id)
    else:
        stmt = stmt.where(Transaction.user_id == user_id, Account.family_id.is_(None))

    if filters:
        if filters.account_id:
            stmt = stmt.where(Transaction.account_id == filters.account_id)
        if filters.category_id:
            stmt = stmt.where(Transaction.category_id == filters.category_id)
        if filters.type:
            stmt = stmt.where(Transaction.type == filters.type)
        if filters.date_from:
            stmt = stmt.where(Transaction.transaction_date >= filters.date_from)
        if filters.date_to:
            stmt = stmt.where(Transaction.transaction_date <= filters.date_to)
        if filters.min_amount:
            stmt = stmt.where(Transaction.amount >= filters.min_amount)
        if filters.max_amount:
            stmt = stmt.where(Transaction.amount <= filters.max_amount)
        if filters.search:
            search_term = f"%{filters.search}%"
            stmt = stmt.where(
                Transaction.description.ilike(search_term)
                | Transaction.merchant.ilike(search_term)
                | Transaction.notes.ilike(search_term)
            )

    # Cursor pagination: cursor is the last transaction's created_at ISO string
    if cursor:
        stmt = stmt.where(Transaction.created_at < cursor)

    stmt = stmt.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
    stmt = stmt.limit(limit + 1)  # Fetch one extra to determine if there's a next page

    result = await db.execute(stmt)
    transactions = list(result.scalars().all())

    next_cursor = None
    if len(transactions) > limit:
        transactions = transactions[:limit]
        next_cursor = transactions[-1].created_at.isoformat()

    return transactions, next_cursor


async def get_transaction(
    db: AsyncSession,
    txn_id: uuid.UUID,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Transaction | None:
    stmt = (
        select(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .where(Transaction.id == txn_id)
    )
    if family_id is not None:
        stmt = stmt.where(Account.family_id == family_id)
    else:
        stmt = stmt.where(Transaction.user_id == user_id, Account.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_transaction(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: TransactionCreate,
    family_id: uuid.UUID | None = None,
) -> Transaction:
    # Verify account belongs to user/family context
    acct_stmt = select(Account).where(Account.id == data.account_id)
    if family_id is not None:
        acct_stmt = acct_stmt.where(Account.family_id == family_id)
    else:
        acct_stmt = acct_stmt.where(Account.user_id == user_id, Account.family_id.is_(None))
    account = await db.execute(acct_stmt)
    if not account.scalar_one_or_none():
        from fastapi import HTTPException, status

        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "ACCOUNT_NOT_FOUND", "message": "Conta não encontrada"},
        )

    # Auto-categorize if no category provided
    category_id = data.category_id
    if not category_id and data.description:
        from app.services.categorize import suggest_category

        category_id = await suggest_category(db, data.description, data.merchant)

    txn = Transaction(
        user_id=user_id,
        account_id=data.account_id,
        category_id=category_id,
        amount=data.amount,
        type=data.type,
        description=data.description,
        merchant=data.merchant,
        tags=data.tags,
        transaction_date=data.transaction_date,
        notes=data.notes,
        is_private=data.is_private,
        needs_review=data.needs_review,
        client_id=data.client_id,
    )
    db.add(txn)

    # Update account balance
    account_obj = await db.get(Account, data.account_id)
    if account_obj:
        if data.type == "income":
            account_obj.balance += data.amount
        elif data.type == "expense":
            account_obj.balance -= data.amount

    await db.flush()
    return txn


async def update_transaction(
    db: AsyncSession, txn: Transaction, data: TransactionUpdate
) -> Transaction:
    old_amount = txn.amount
    old_type = txn.type

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(txn, field, value)

    # Recalculate balance if amount or type changed
    if "amount" in update_data or "type" in update_data:
        account = await db.get(Account, txn.account_id)
        if account:
            # Reverse old
            if old_type == "income":
                account.balance -= old_amount
            elif old_type == "expense":
                account.balance += old_amount
            # Apply new
            if txn.type == "income":
                account.balance += txn.amount
            elif txn.type == "expense":
                account.balance -= txn.amount

    await db.flush()
    return txn


async def delete_transaction(db: AsyncSession, txn: Transaction) -> None:
    # Reverse balance
    account = await db.get(Account, txn.account_id)
    if account:
        if txn.type == "income":
            account.balance -= txn.amount
        elif txn.type == "expense":
            account.balance += txn.amount

    await db.delete(txn)
    await db.flush()
