"""Fact memory — persistent facts about the user stored in PostgreSQL."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_user_facts(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    """Get all active facts for a user."""
    from app.models.user import User

    # We need to query user_facts table directly
    # For now, we'll use a simple approach querying the user's preferences
    # The full user_facts table will be used when we have it in the models
    # For Phase 2, we store facts as a simple key-value approach

    result = await db.execute(
        select(User.preferences, User.salary_day, User.currency_default, User.country)
        .where(User.id == user_id)
    )
    row = result.one_or_none()
    if not row:
        return []

    facts = []
    if row.salary_day:
        facts.append({"fact_key": "salary_day", "fact_value": str(row.salary_day)})
    if row.currency_default:
        facts.append({"fact_key": "currency", "fact_value": str(row.currency_default)})
    if row.country:
        facts.append({"fact_key": "country", "fact_value": str(row.country)})

    # Extract from preferences JSONB
    prefs = row.preferences or {}
    for key, value in prefs.items():
        if key.startswith("fact_"):
            facts.append({"fact_key": key, "fact_value": str(value)})

    return facts


async def save_user_fact(
    db: AsyncSession,
    user_id: uuid.UUID,
    fact_key: str,
    fact_value: str,
) -> None:
    """Save a fact to the user's preferences (JSONB field).
    In production, this would use a dedicated user_facts table.
    """
    from app.models.user import User

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    prefs = dict(user.preferences or {})
    prefs[f"fact_{fact_key}"] = fact_value
    user.preferences = prefs
    await db.flush()
