"""Account service: CRUD operations and balance summary."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import AccountType
from app.schemas.account import AccountCreate, AccountSummary, AccountUpdate


async def list_accounts(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_archived: bool = False,
    cursor: str | None = None,
    limit: int = 50,
    family_id: uuid.UUID | None = None,
) -> tuple[list[Account], str | None]:
    """List accounts with cursor-based pagination.
    Returns (accounts, next_cursor).

    Context filtering:
    - family_id=None (personal): user_id match AND family_id IS NULL
    - family_id=<uuid> (family): family_id match (shared accounts)
    """
    stmt = select(Account)
    if family_id is not None:
        stmt = stmt.where(Account.family_id == family_id)
    else:
        stmt = stmt.where(Account.user_id == user_id, Account.family_id.is_(None))
    if not include_archived:
        stmt = stmt.where(Account.is_archived.is_(False))
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Account.id < cursor_uuid)
    stmt = stmt.order_by(Account.created_at.desc(), Account.id.desc())
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    accounts = list(result.scalars().all())

    next_cursor = None
    if len(accounts) > limit:
        accounts = accounts[:limit]
        next_cursor = str(accounts[-1].id)

    return accounts, next_cursor


async def get_account(
    db: AsyncSession,
    account_id: uuid.UUID,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Account | None:
    """Get a single account respecting context.

    - family_id=None: personal account (user_id match, family_id IS NULL)
    - family_id=<uuid>: family account (family_id match)
    """
    stmt = select(Account).where(Account.id == account_id)
    if family_id is not None:
        stmt = stmt.where(Account.family_id == family_id)
    else:
        stmt = stmt.where(Account.user_id == user_id, Account.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: AccountCreate,
    family_id: uuid.UUID | None = None,
) -> Account:
    account = Account(
        user_id=user_id,
        family_id=family_id,
        name=data.name,
        type=data.type,
        currency=data.currency,
        balance=data.balance,
        icon=data.icon,
        color=data.color,
        institution=data.institution,
        iban=data.iban,
        nib=data.nib,
        swift_code=data.swift_code,
        account_holder=data.account_holder,
        sort_order=data.sort_order,
    )
    db.add(account)
    await db.flush()
    return account


async def update_account(
    db: AsyncSession, account: Account, data: AccountUpdate
) -> Account:
    """Update editable account metadata.

    Defence in depth: `balance` is server-managed — it is derived from the
    transaction history and must never be set directly via this endpoint.
    Today AccountUpdate doesn't expose `balance`, so this guard is dormant,
    but the moment someone adds the field for an "adjust balance" feature
    the guard prevents silent overwrite of the running total. Any balance
    correction must go through a real adjustment transaction.
    """
    update_data = data.model_dump(exclude_unset=True)
    if "balance" in update_data:
        raise ValueError(
            "O saldo da conta é calculado a partir das transacções e não "
            "pode ser alterado directamente. Para corrigir o saldo, registe "
            "uma transacção de ajuste."
        )
    for field, value in update_data.items():
        setattr(account, field, value)
    await db.flush()
    return account


async def delete_account(db: AsyncSession, account: Account) -> None:
    await db.delete(account)
    await db.flush()


async def get_account_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> AccountSummary:
    accounts, _ = await list_accounts(db, user_id, family_id=family_id)

    from app.schemas.account import AccountResponse

    asset_types = {AccountType.BANK, AccountType.DIGITAL_WALLET, AccountType.CASH, AccountType.SAVINGS}
    liability_types = {AccountType.CREDIT_CARD, AccountType.LOAN}

    total_assets = sum(a.balance for a in accounts if a.type in asset_types)
    total_liabilities = sum(abs(a.balance) for a in accounts if a.type in liability_types)

    return AccountSummary(
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=total_assets - total_liabilities,
        currency="AOA",
        accounts=[AccountResponse.model_validate(a) for a in accounts],
    )
