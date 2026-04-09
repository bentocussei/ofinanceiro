"""Transaction service: CRUD with filters and cursor pagination."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
    stmt = (
        select(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.category),
        )
    )
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
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.category),
        )
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
    # Idempotency: if the client supplied a client_id and a transaction
    # already exists for this (user_id, client_id) tuple, return it instead
    # of inserting a duplicate. The model already enforces uniqueness via
    # uq_txn_client_id, so without this lookup a double-tap from the mobile
    # app (or a network retry) would 500 with an integrity-error trace.
    if data.client_id is not None:
        existing = await db.execute(
            select(Transaction).where(
                Transaction.user_id == user_id,
                Transaction.client_id == data.client_id,
            )
        )
        existing_txn = existing.scalar_one_or_none()
        if existing_txn is not None:
            return existing_txn

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
        source_type="manual",
        source_id=None,
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
    """Update a transaction while keeping every affected account balance correct.

    Three independent dimensions can change in one PUT and they all affect
    balances:

        1. amount    — same account, delta of (new − old)
        2. type      — same account, sign flip
        3. account_id — money moves from old account to new account

    The previous implementation only handled (1) and (2), AND only against
    the *new* account_id (because setattr had already overwritten it). Moving
    a transaction across accounts via PUT silently corrupted both balances.

    This rewrite captures the old (account_id, amount, type) tuple BEFORE
    touching the row, applies the field updates, then recomputes balances
    against the correct accounts in a single pass.
    """
    update_data = data.model_dump(exclude_unset=True)

    old_amount = txn.amount
    old_type = txn.type
    old_account_id = txn.account_id

    new_account_id = update_data.get("account_id", old_account_id)

    # Cross-account move: validate before mutating anything
    if new_account_id != old_account_id:
        new_account = await db.get(Account, new_account_id)
        if not new_account:
            raise ValueError("Conta de destino não encontrada")
        if new_account.user_id != txn.user_id:
            raise ValueError("A conta de destino não pertence a este utilizador")
        old_account_obj = await db.get(Account, old_account_id)
        if old_account_obj and old_account_obj.currency != new_account.currency:
            raise ValueError(
                f"Moedas diferentes: {old_account_obj.currency} → {new_account.currency}. "
                "Não é possível mover entre moedas diferentes."
            )

    # Apply field updates (including account_id if present)
    for field, value in update_data.items():
        setattr(txn, field, value)

    balance_affecting_change = (
        "amount" in update_data
        or "type" in update_data
        or new_account_id != old_account_id
    )

    if balance_affecting_change:
        # Reverse old impact on the OLD account
        old_account_obj = await db.get(Account, old_account_id)
        if old_account_obj:
            if old_type == "income":
                old_account_obj.balance -= old_amount
            elif old_type == "expense":
                old_account_obj.balance += old_amount
        # Apply new impact on the NEW account (which is the same row as old
        # if the txn didn't move — SQLAlchemy returns the cached instance,
        # so the previous reverse and this apply compose correctly)
        new_account_obj = await db.get(Account, txn.account_id)
        if new_account_obj:
            if txn.type == "income":
                new_account_obj.balance += txn.amount
            elif txn.type == "expense":
                new_account_obj.balance -= txn.amount

    await db.flush()
    return txn


async def move_transaction(
    db: AsyncSession,
    txn: Transaction,
    target_account_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Transaction:
    """Move a transaction from one account to another (e.g., personal → family).

    Business rules:
    1. Cannot move to the same account
    2. Target account must belong to the same user
    3. Currencies must match (no cross-currency moves)
    4. Reverse balance on the original account
    5. Apply balance on the target account
    6. Update the transaction's account_id

    Raises ValueError for validation failures.
    """
    # Validation: same account
    if txn.account_id == target_account_id:
        raise ValueError("A transacção já está nesta conta")

    old_account = await db.get(Account, txn.account_id)
    new_account = await db.get(Account, target_account_id)

    if not new_account:
        raise ValueError("Conta de destino não encontrada")

    # Validation: ownership — target must belong to same user
    if new_account.user_id != user_id:
        raise ValueError("A conta de destino não pertence a este utilizador")

    # Validation: currency must match
    if old_account and old_account.currency != new_account.currency:
        raise ValueError(
            f"Moedas diferentes: {old_account.currency} → {new_account.currency}. "
            "Não é possível mover entre moedas diferentes."
        )

    # 1. Reverse balance on original account
    if old_account:
        if txn.type == "income":
            old_account.balance -= txn.amount
        elif txn.type == "expense":
            old_account.balance += txn.amount

    # 2. Apply balance on target account
    if txn.type == "income":
        new_account.balance += txn.amount
    elif txn.type == "expense":
        new_account.balance -= txn.amount
    # Note: "transfer" type transactions don't affect individual account balances
    # — they represent money moving between accounts (handled separately)

    # 3. Update transaction
    txn.account_id = target_account_id

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
