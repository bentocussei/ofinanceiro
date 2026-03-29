"""Transactions router: CRUD with filters and pagination."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import TransactionType
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
