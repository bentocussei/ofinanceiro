"""Investment service — business rules for investment tracking.

Contains all logic previously inline in routers/investments.py.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.investment import Investment
from app.schemas.investment import InvestmentCreate, InvestmentUpdate


async def list_investments(
    db: AsyncSession, user_id: uuid.UUID, active_only: bool = True,
    family_id: uuid.UUID | None = None,
) -> list[Investment]:
    """List investments with context-aware filtering."""
    if family_id:
        query = select(Investment).where(Investment.family_id == family_id)
    else:
        query = select(Investment).where(Investment.user_id == user_id, Investment.family_id.is_(None))
    if active_only:
        query = query.where(Investment.is_active.is_(True))
    query = query.order_by(Investment.current_value.desc())
    result = await db.scalars(query)
    return list(result.all())


async def get_investment(
    db: AsyncSession, investment_id: uuid.UUID, user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Investment | None:
    """Get a single investment by ID."""
    if family_id:
        stmt = select(Investment).where(Investment.id == investment_id, Investment.family_id == family_id)
    else:
        stmt = select(Investment).where(Investment.id == investment_id, Investment.user_id == user_id, Investment.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_investment(
    db: AsyncSession, user_id: uuid.UUID, data: InvestmentCreate,
    family_id: uuid.UUID | None = None,
) -> Investment:
    """Create a new investment.

    If from_account_id is provided, debits the account.
    """
    interest_rate = data.get_interest_rate_bp()

    investment = Investment(
        user_id=user_id,
        family_id=family_id,
        name=data.name,
        type=data.type,
        institution=data.institution,
        invested_amount=data.invested_amount,
        current_value=data.current_value,
        interest_rate=interest_rate,
        notes=data.notes,
    )
    if data.start_date:
        investment.start_date = data.start_date
    if data.maturity_date:
        investment.maturity_date = data.maturity_date

    # Debit source account if provided
    if data.from_account_id:
        account = await db.get(Account, data.from_account_id)
        if account and account.user_id == user_id:
            account.balance -= data.invested_amount

    db.add(investment)
    await db.flush()
    return investment


async def update_investment(
    db: AsyncSession, investment: Investment, data: InvestmentUpdate,
) -> Investment:
    """Update an investment."""
    update_data = data.model_dump(exclude_unset=True)

    # Handle annual_return_rate → interest_rate conversion
    if "annual_return_rate" in update_data:
        bp = data.get_interest_rate_bp()
        if bp is not None:
            investment.interest_rate = bp
        del update_data["annual_return_rate"]

    for field, value in update_data.items():
        setattr(investment, field, value)

    await db.flush()
    return investment


async def delete_investment(db: AsyncSession, investment: Investment) -> None:
    """Delete an investment."""
    await db.delete(investment)
    await db.flush()
