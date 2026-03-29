"""LLM-based categorization with feedback loop.
Falls back to rule-based categorization if LLM unavailable.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.categorize import suggest_category as rule_based_suggest

logger = logging.getLogger(__name__)


async def categorize_with_ai(
    db: AsyncSession,
    description: str,
    merchant: str | None = None,
) -> uuid.UUID | None:
    """Try LLM categorization first, fall back to rules.
    Currently uses rule-based only (LLM categorization requires API key).
    """
    # For now, use rule-based (Phase 2 foundation — LLM version needs API key)
    return await rule_based_suggest(db, description, merchant)


async def record_categorization_feedback(
    db: AsyncSession,
    transaction_id: uuid.UUID,
    correct_category_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Record when user corrects a categorization.
    This feedback improves future categorization accuracy.
    """
    from app.models.transaction import Transaction

    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        )
    )
    txn = result.scalar_one_or_none()
    if txn:
        txn.category_id = correct_category_id
        await db.flush()
        logger.info(
            "Categorization feedback: txn=%s corrected to category=%s",
            transaction_id,
            correct_category_id,
        )
