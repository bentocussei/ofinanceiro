"""Import router: bank statement upload and processing."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.account import Account
from app.models.user import User
from app.services.statement_import import (
    categorize_imported_transactions,
    check_duplicates,
    parse_csv_statement,
)

router = APIRouter(prefix="/api/v1/import", tags=["import"])


class StatementUploadRequest(BaseModel):
    content: str = Field(max_length=5_000_000, description="CSV content as string (max 5MB)")
    account_id: uuid.UUID
    file_type: str = Field("csv", description="csv or pdf")


class ImportConfirmRequest(BaseModel):
    account_id: uuid.UUID
    transactions: list[dict] = Field(description="Transactions to import (from preview)")


@router.post("/preview")
async def preview_import(
    data: StatementUploadRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Parse and preview bank statement before importing."""
    if data.file_type == "csv":
        transactions = parse_csv_statement(data.content)
    else:
        return {"error": "Apenas CSV suportado nesta versão. PDF será adicionado em breve."}

    if not transactions:
        return {"error": "Nenhuma transacção encontrada no ficheiro."}

    # Check duplicates
    transactions = await check_duplicates(db, user.id, transactions)

    # Auto-categorize
    transactions = await categorize_imported_transactions(db, transactions)

    duplicates = sum(1 for t in transactions if t.get("is_duplicate"))

    return {
        "total": len(transactions),
        "duplicates": duplicates,
        "new": len(transactions) - duplicates,
        "transactions": transactions,
    }


@router.post("/confirm")
async def confirm_import(
    data: ImportConfirmRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Import confirmed transactions into the database."""
    # Verify account ownership
    acct_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == user.id)
    )
    if not acct_result.scalar_one_or_none():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")

    from app.models.transaction import Transaction

    imported = 0
    for txn_data in data.transactions:
        txn = Transaction(
            user_id=user.id,
            account_id=data.account_id,
            amount=txn_data["amount"],
            type=txn_data["type"],
            description=txn_data.get("description"),
            transaction_date=txn_data.get("date"),
            category_id=txn_data.get("suggested_category_id") or None,
            source_type="import",
            source_id=None,
        )
        db.add(txn)
        imported += 1

    await db.flush()
    return {"imported": imported, "message": f"{imported} transacções importadas com sucesso"}
