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
    """Create a new debt.

    Invariant: 0 <= current_balance <= original_amount. If the caller does not
    supply current_balance, it defaults to original_amount (no payments yet).
    """
    current_balance = data.current_balance if data.current_balance is not None else data.original_amount
    if current_balance < 0 or current_balance > data.original_amount:
        raise ValueError(
            f"O saldo devedor inicial deve estar entre 0 e o valor original "
            f"({data.original_amount / 100:.0f} Kz)."
        )
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
    """Update a debt while preserving the core invariants.

    Invariants enforced:
        1. 0 <= current_balance <= original_amount  (always)
        2. original_amount is immutable once at least one payment exists
           (the original principal is a historical fact — to "fix" the
           outstanding balance after payments, the user must register an
           adjustment payment, not rewrite history)
        3. If the user changes original_amount AND no payments exist yet,
           current_balance is reset to the new original_amount so both
           values stay in sync (typo correction case)

    Auto state transitions:
        - balance reaches 0 → is_paid_off=True, is_active=False
        - balance restored above 0 from a paid-off state → reactivated
    """
    update_data = data.model_dump(exclude_unset=True)

    # Total already paid (debt.payments is auto-loaded via lazy="subquery")
    total_paid = sum(p.amount for p in debt.payments)

    # Invariant 2 + 3: handle original_amount changes
    if "original_amount" in update_data:
        new_original = update_data["original_amount"]
        if new_original is None:
            update_data.pop("original_amount", None)
        elif new_original == debt.original_amount:
            # No-op change — drop it to avoid unnecessary side-effects
            update_data.pop("original_amount", None)
        elif total_paid > 0:
            raise ValueError(
                "Não é possível alterar o valor original depois de existirem "
                "pagamentos registados. Para corrigir o saldo devedor, "
                "registe um pagamento de ajuste."
            )
        else:
            # No payments yet — typo correction. Sync both columns.
            debt.original_amount = new_original
            debt.current_balance = new_original
            update_data.pop("original_amount", None)
            # If the caller also tried to set current_balance, ignore it —
            # we already enforced consistency above.
            update_data.pop("current_balance", None)

    # Invariant 1: validate any direct current_balance change
    if "current_balance" in update_data and update_data["current_balance"] is not None:
        new_balance = update_data["current_balance"]
        if new_balance < 0 or new_balance > debt.original_amount:
            raise ValueError(
                f"O saldo devedor deve estar entre 0 e o valor original "
                f"({debt.original_amount / 100:.0f} Kz)."
            )

    # Apply remaining fields
    for field, value in update_data.items():
        setattr(debt, field, value)

    # Auto state transitions
    if debt.current_balance <= 0:
        debt.is_active = False
        debt.is_paid_off = True
    elif debt.is_paid_off:
        # Balance was restored above zero — reactivate
        debt.is_paid_off = False
        debt.is_active = True

    await db.flush()
    return debt


async def delete_debt(db: AsyncSession, debt: Debt) -> None:
    """Delete a debt and clear provenance from any transactions it spawned.

    debt_payments cascade-delete via the FK, but the user-visible
    `transactions` rows that were created when payments were registered
    have `source_type='debt_payment'` and `source_id=debt.id`. Without
    this cleanup those references would dangle silently — the transaction
    still appears on the user's history but its "from debt X" provenance
    points to a deleted row. Clear them so the audit trail stays honest.
    """
    from sqlalchemy import update as sa_update

    await db.execute(
        sa_update(Transaction)
        .where(
            Transaction.source_type == "debt_payment",
            Transaction.source_id == debt.id,
        )
        .values(source_type=None, source_id=None)
    )
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

    Concurrency: re-fetches both the debt and the source account with
    SELECT ... FOR UPDATE so two simultaneous payments on the same debt
    (e.g. double-tap, network retry, two devices at once) serialize on
    the database row instead of both reading the same balance and each
    writing balance - amount independently. Locks are taken in a fixed
    order (debt first, then account) so concurrent operations on the
    same pair never deadlock.
    """
    payment_date = data.payment_date or date.today()

    # Re-acquire the debt with a row-level lock so any concurrent payment
    # waits until this transaction commits. populate_existing=True is
    # MANDATORY here: the router has already loaded the debt earlier in
    # the same session, so without it SQLAlchemy returns the cached
    # instance with the stale current_balance and concurrent payments
    # silently overwrite each other (5 payments × 1k → debt only loses
    # 1k instead of 5k). Forcing populate_existing makes the lock query
    # also REFRESH the in-memory attributes from the row we just locked.
    locked_debt = await db.execute(
        select(Debt)
        .where(Debt.id == debt.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    debt = locked_debt.scalar_one()

    # Determine source account
    account_id = data.from_account_id or debt.linked_account_id
    transaction_id: uuid.UUID | None = None

    if account_id:
        # Lock the account row the same way (populate_existing forces a
        # fresh read of `balance` even if the row was loaded earlier).
        locked_acc = await db.execute(
            select(Account)
            .where(Account.id == account_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        account = locked_acc.scalar_one_or_none()
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

    total_interest = total_paid_normal - current_balance

    return {
        # Frontend expected fields
        "months_to_payoff": months_normal,
        "total_interest": total_interest,
        "total_paid": total_paid_normal,
        # Extra payment fields
        "months_saved": months_normal - months_extra,
        "interest_saved": total_paid_normal - total_paid_extra,
        # Legacy fields for backward compat
        "without_extra": {"months": months_normal, "total_paid": total_paid_normal},
        "with_extra": {"months": months_extra, "total_paid": total_paid_extra},
        "savings": total_paid_normal - total_paid_extra,
    }
