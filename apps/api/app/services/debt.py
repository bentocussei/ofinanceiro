"""Debt service — business rules for debt management."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt
from app.schemas.debt import DebtCreate, DebtUpdate


async def list_debts(
    db: AsyncSession, user_id: uuid.UUID, active_only: bool = True
) -> list[Debt]:
    """List user's debts."""
    query = select(Debt).where(Debt.user_id == user_id)
    if active_only:
        query = query.where(Debt.is_active.is_(True))
    query = query.order_by(Debt.current_balance.desc())
    result = await db.scalars(query)
    return list(result.all())


async def get_debt(db: AsyncSession, debt_id: uuid.UUID, user_id: uuid.UUID) -> Debt | None:
    """Get a single debt by ID."""
    result = await db.execute(
        select(Debt).where(Debt.id == debt_id, Debt.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_debt(db: AsyncSession, user_id: uuid.UUID, data: DebtCreate) -> Debt:
    """Create a new debt."""
    debt = Debt(
        user_id=user_id,
        name=data.name,
        type=data.type,
        creditor=data.creditor,
        original_amount=data.original_amount,
        current_balance=data.current_balance,
        interest_rate=data.interest_rate,
        monthly_payment=data.monthly_payment,
        payment_day=data.payment_day,
        start_date=data.start_date,
        expected_end_date=data.expected_end_date,
        nature=data.nature,
        notes=data.notes,
    )
    db.add(debt)
    await db.flush()
    return debt


async def update_debt(db: AsyncSession, debt: Debt, data: DebtUpdate) -> Debt:
    """Update a debt. Marks as paid off if balance reaches 0."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(debt, field, value)

    # Auto mark as paid off
    if debt.current_balance <= 0:
        debt.is_active = False
        from datetime import datetime, timezone
        debt.is_paid_off = True
        debt.paid_off_at = datetime.now(timezone.utc)

    await db.flush()
    return debt


async def delete_debt(db: AsyncSession, debt: Debt) -> None:
    """Delete a debt."""
    await db.delete(debt)
    await db.flush()
