"""Accounts router: CRUD + summary."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse, AccountSummary, AccountUpdate
from app.schemas.transfer import TransferRequest, TransferResponse
from app.services import account as account_service

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


@router.get("/")
async def list_accounts(
    include_archived: bool = False,
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    accounts, next_cursor = await account_service.list_accounts(
        db, user.id, include_archived, cursor, limit, family_id=ctx.family_id
    )
    return {
        "items": [AccountResponse.model_validate(a) for a in accounts],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.get("/summary", response_model=AccountSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> AccountSummary:
    return await account_service.get_account_summary(db, user.id, family_id=ctx.family_id)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> AccountResponse:
    account = await account_service.get_account(db, account_id, user.id, family_id=ctx.family_id)
    if not account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Conta não encontrada"})
    return AccountResponse.model_validate(account)


@router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("accounts:manage:create"),
) -> AccountResponse:
    require_permission(ctx, "can_add_transactions")
    account = await account_service.create_account(db, user.id, data, family_id=ctx.family_id)
    return AccountResponse.model_validate(account)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> AccountResponse:
    require_permission(ctx, "can_add_transactions")
    account = await account_service.get_account(db, account_id, user.id, family_id=ctx.family_id)
    if not account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Conta não encontrada"})
    updated = await account_service.update_account(db, account, data)
    return AccountResponse.model_validate(updated)


@router.post("/transfer", response_model=TransferResponse, status_code=201)
async def transfer(
    data: TransferRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("accounts:transfer:create"),
) -> TransferResponse:
    """Transfer between own accounts. Creates expense on source, income on destination."""
    require_permission(ctx, "can_add_transactions")
    if data.from_account_id == data.to_account_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"code": "SAME_ACCOUNT", "message": "Não pode transferir para a mesma conta"})

    from_account = await account_service.get_account(db, data.from_account_id, user.id, family_id=ctx.family_id)
    to_account = await account_service.get_account(db, data.to_account_id, user.id, family_id=ctx.family_id)

    if not from_account or not to_account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "ACCOUNT_NOT_FOUND", "message": "Conta não encontrada"})

    description = data.description or f"Transferência: {from_account.name} → {to_account.name}"

    # Create expense on source
    txn_out = Transaction(
        user_id=user.id,
        account_id=data.from_account_id,
        amount=data.amount,
        type=TransactionType.TRANSFER,
        description=description,
    )
    db.add(txn_out)
    from_account.balance -= data.amount

    # Create income on destination
    txn_in = Transaction(
        user_id=user.id,
        account_id=data.to_account_id,
        amount=data.amount,
        type=TransactionType.TRANSFER,
        description=description,
    )
    db.add(txn_in)
    to_account.balance += data.amount

    await db.flush()

    return TransferResponse(
        message="Transferência realizada com sucesso",
        from_transaction_id=txn_out.id,
        to_transaction_id=txn_in.id,
    )


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_add_transactions")
    account = await account_service.get_account(db, account_id, user.id, family_id=ctx.family_id)
    if not account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Conta não encontrada"})
    await account_service.delete_account(db, account)
