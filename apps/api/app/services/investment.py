"""Investment service — business rules for investment tracking."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.investment import Investment
from app.schemas.investment import InvestmentCreate, InvestmentUpdate


async def list_investments(
    db: AsyncSession, user_id: uuid.UUID, active_only: bool = True
) -> list[Investment]:
    """List user's investments."""
    query = select(Investment).where(Investment.user_id == user_id)
    if active_only:
        query = query.where(Investment.is_active.is_(True))
    query = query.order_by(Investment.current_value.desc())
    result = await db.scalars(query)
    return list(result.all())


async def get_investment(
    db: AsyncSession, investment_id: uuid.UUID, user_id: uuid.UUID
) -> Investment | None:
    """Get a single investment by ID."""
    result = await db.execute(
        select(Investment).where(Investment.id == investment_id, Investment.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_investment(
    db: AsyncSession, user_id: uuid.UUID, data: InvestmentCreate
) -> Investment:
    """Create a new investment."""
    investment = Investment(
        user_id=user_id,
        name=data.name,
        type=data.type,
        institution=data.institution,
        invested_amount=data.invested_amount,
        current_value=data.current_value,
        interest_rate=data.interest_rate,
        start_date=data.start_date,
        maturity_date=data.maturity_date,
        notes=data.notes,
    )
    db.add(investment)
    await db.flush()
    return investment


async def update_investment(
    db: AsyncSession, investment: Investment, data: InvestmentUpdate
) -> Investment:
    """Update an investment."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(investment, field, value)
    await db.flush()
    return investment


async def delete_investment(db: AsyncSession, investment: Investment) -> None:
    """Delete an investment."""
    await db.delete(investment)
    await db.flush()
