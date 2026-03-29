"""Bank statement import: CSV parser for Angola banks (BAI, BFA, BIC)."""

import csv
import hashlib
import io
import logging
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.services.categorize import suggest_category

logger = logging.getLogger(__name__)


def parse_csv_statement(csv_content: str) -> list[dict]:
    """Parse a CSV bank statement. Attempts to auto-detect column format.
    Returns list of transaction dicts.
    """
    reader = csv.reader(io.StringIO(csv_content))
    rows = list(reader)

    if len(rows) < 2:
        return []

    # Try to detect header
    header = [col.lower().strip() for col in rows[0]]
    data_rows = rows[1:]

    # Common column name mappings for Angola banks
    date_cols = ["data", "date", "data movimento", "data valor"]
    desc_cols = ["descricao", "descrição", "description", "descritivo", "movimento"]
    amount_cols = ["valor", "amount", "montante", "debito", "credito"]

    date_idx = next((i for i, h in enumerate(header) if h in date_cols), None)
    desc_idx = next((i for i, h in enumerate(header) if h in desc_cols), None)
    amount_idx = next((i for i, h in enumerate(header) if h in amount_cols), None)

    # Fallback: assume date=0, desc=1, amount=2
    if date_idx is None:
        date_idx = 0
    if desc_idx is None:
        desc_idx = 1 if len(header) > 1 else 0
    if amount_idx is None:
        amount_idx = 2 if len(header) > 2 else 1

    transactions = []
    for row in data_rows:
        if len(row) <= max(date_idx, desc_idx, amount_idx):
            continue

        try:
            raw_date = row[date_idx].strip()
            description = row[desc_idx].strip()
            raw_amount = row[amount_idx].strip().replace(",", ".").replace(" ", "")

            if not raw_amount or not description:
                continue

            amount = float(raw_amount)
            txn_type = "income" if amount > 0 else "expense"
            amount_centavos = int(abs(amount) * 100)

            # Parse date (try common formats)
            txn_date = None
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y"]:
                try:
                    txn_date = date.fromisoformat(raw_date) if "-" in raw_date and len(raw_date) == 10 else None
                    if not txn_date:
                        from datetime import datetime

                        txn_date = datetime.strptime(raw_date, fmt).date()
                    break
                except (ValueError, TypeError):
                    continue

            if not txn_date:
                txn_date = date.today()

            # Generate a hash for duplicate detection
            content_hash = hashlib.sha256(
                f"{txn_date}{description}{amount_centavos}".encode()
            ).hexdigest()[:16]

            transactions.append({
                "date": txn_date.isoformat(),
                "description": description,
                "amount": amount_centavos,
                "type": txn_type,
                "hash": content_hash,
            })
        except (ValueError, IndexError):
            continue

    return transactions


async def check_duplicates(
    db: AsyncSession, user_id: uuid.UUID, transactions: list[dict]
) -> list[dict]:
    """Check for duplicate transactions and mark them."""
    for txn in transactions:
        # Simple duplicate check: same date + amount + similar description
        result = await db.execute(
            select(Transaction.id).where(
                Transaction.user_id == user_id,
                Transaction.transaction_date == txn["date"],
                Transaction.amount == txn["amount"],
            ).limit(1)
        )
        txn["is_duplicate"] = result.scalar_one_or_none() is not None

    return transactions


async def categorize_imported_transactions(
    db: AsyncSession, transactions: list[dict]
) -> list[dict]:
    """Auto-categorize imported transactions using rule-based system."""
    for txn in transactions:
        category_id = await suggest_category(db, txn.get("description", ""))
        txn["suggested_category_id"] = str(category_id) if category_id else None

    return transactions
