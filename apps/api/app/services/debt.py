"""Debt service — business rules for debt management.

Contains all logic previously inline in routers/debts.py:
- CRUD with context-aware filtering
- Payment registration with balance update + transaction creation
- Auto paid-off marking
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.debt import Debt, DebtPayment
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.schemas.debt import DebtCreate, DebtUpdate, PaymentCreate


async def list_debts(
    db: AsyncSession, user_id: uuid.UUID, active_only: bool = True,
    family_id: uuid.UUID | None = None,
) -> list[Debt]:
    """List debts with context-aware filtering."""
    if family_id:
        query = select(Debt).where(Debt.family_id == family_id)
    else:
        query = select(Debt).where(Debt.user_id == user_id, Debt.family_id.is_(None))
    if active_only:
        query = query.where(Debt.is_active.is_(True))
    query = query.order_by(Debt.current_balance.desc())
    result = await db.scalars(query)
    return list(result.all())


async def get_debt(
    db: AsyncSession, debt_id: uuid.UUID, user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Debt | None:
    """Get a single debt by ID with context-aware filtering."""
    if family_id:
        stmt = select(Debt).where(Debt.id == debt_id, Debt.family_id == family_id)
    else:
        stmt = select(Debt).where(Debt.id == debt_id, Debt.user_id == user_id, Debt.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_debt(
    db: AsyncSession, user_id: uuid.UUID, data: DebtCreate,
    family_id: uuid.UUID | None = None,
) -> Debt:
    """Create a new debt."""
    current_balance = data.current_balance if data.current_balance is not None else data.original_amount
    kwargs: dict = {
        "user_id": user_id,
        "family_id": family_id,
        "name": data.name,
        "type": data.type,
        "creditor": data.creditor or data.creditor_name,
        "original_amount": data.original_amount,
        "current_balance": current_balance,
        "interest_rate": data.interest_rate,
        "monthly_payment": data.monthly_payment,
        "payment_day": data.payment_day,
        "notes": data.notes,
    }
    if data.nature:
        kwargs["nature"] = data.nature
    if data.creditor_type:
        kwargs["creditor_type"] = data.creditor_type
    if data.start_date:
        kwargs["start_date"] = data.start_date
    if data.expected_end_date:
        kwargs["expected_end_date"] = data.expected_end_date
    if data.linked_account_id:
        kwargs["linked_account_id"] = data.linked_account_id
    if data.auto_pay_enabled is not None:
        kwargs["auto_pay_enabled"] = data.auto_pay_enabled

    debt = Debt(**kwargs)
    db.add(debt)
    await db.flush()
    return debt


async def update_debt(db: AsyncSession, debt: Debt, data: DebtUpdate) -> Debt:
    """Update a debt. Auto-marks as paid off if balance reaches 0."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(debt, field, value)

    if debt.current_balance <= 0:
        debt.is_active = False
        debt.is_paid_off = True

    await db.flush()
    return debt


async def delete_debt(db: AsyncSession, debt: Debt) -> None:
    """Delete a debt."""
    await db.delete(debt)
    await db.flush()


async def register_payment(
    db: AsyncSession, user_id: uuid.UUID, debt: Debt, data: PaymentCreate,
) -> dict:
    """Register a debt payment.

    Business rules:
    1. Debit the source account (if provided or linked)
    2. Create an expense transaction for the payment
    3. Reduce debt current_balance
    4. Mark as paid off if balance reaches 0
    """
    payment_date = data.payment_date or date.today()

    # Determine source account
    account_id = data.from_account_id or debt.linked_account_id
    transaction_id: uuid.UUID | None = None

    if account_id:
        account = await db.get(Account, account_id)
        if account:
            # Debit account
            account.balance -= data.amount

            # Create expense transaction
            txn = Transaction(
                user_id=user_id,
                account_id=account_id,
                amount=data.amount,
                type=TransactionType.EXPENSE,
                description=f"Pagamento: {debt.name}",
                transaction_date=payment_date,
                source_type="debt_payment",
                source_id=debt.id,
            )
            db.add(txn)
            await db.flush()
            transaction_id = txn.id

    # Record payment
    payment = DebtPayment(
        debt_id=debt.id,
        amount=data.amount,
        payment_date=payment_date,
        transaction_id=transaction_id,
    )
    db.add(payment)

    # Update balance
    debt.current_balance = max(0, debt.current_balance - data.amount)
    if debt.current_balance == 0:
        debt.is_active = False
        debt.is_paid_off = True

    await db.flush()

    return {
        "success": True,
        "remaining_balance": debt.current_balance,
        "transaction_id": str(transaction_id) if transaction_id else None,
    }


# ---------------------------------------------------------------------------
# Simulation (moved from router)
# ---------------------------------------------------------------------------

def simulate_payoff(
    current_balance: int, monthly_payment: int,
    interest_rate_bp: int = 0, extra_payment: int = 0,
) -> dict:
    """Simulate debt payoff with optional extra monthly payment. Pure calculation."""
    if monthly_payment <= 0:
        return {"error": "Prestação deve ser positiva"}

    total_payment = monthly_payment + extra_payment
    monthly_rate = (interest_rate_bp / 10000) / 12

    # Without extra
    balance = current_balance
    months_normal = 0
    total_paid_normal = 0
    while balance > 0 and months_normal < 600:
        interest = int(balance * monthly_rate)
        principal = monthly_payment - interest
        if principal <= 0:
            return {"error": "Prestação não cobre os juros"}
        balance = max(0, balance - principal)
        total_paid_normal += monthly_payment
        months_normal += 1

    # With extra
    balance = current_balance
    months_extra = 0
    total_paid_extra = 0
    while balance > 0 and months_extra < 600:
        interest = int(balance * monthly_rate)
        principal = total_payment - interest
        if principal <= 0:
            return {"error": "Pagamento não cobre os juros"}
        balance = max(0, balance - principal)
        total_paid_extra += total_payment
        months_extra += 1

    return {
        "without_extra": {"months": months_normal, "total_paid": total_paid_normal},
        "with_extra": {"months": months_extra, "total_paid": total_paid_extra},
        "savings": total_paid_normal - total_paid_extra,
        "months_saved": months_normal - months_extra,
    }
