"""Bills router: CRUD + marcar como pago."""

import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.account import Account
from app.models.bill import Bill
from app.models.enums import BillStatus, CurrencyCode, RecurrenceFrequency, TransactionType
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/api/v1/bills", tags=["bills"])


class BillCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=100)
    description: str | None = None
    category_id: uuid.UUID | None = None
    amount: int = Field(gt=0)
    currency: CurrencyCode = CurrencyCode.AOA
    due_day: int = Field(ge=1, le=31)
    frequency: RecurrenceFrequency = RecurrenceFrequency.MONTHLY
    pay_from_account_id: uuid.UUID | None = None
    auto_pay: bool = False
    auto_pay_days_before: int = Field(0, ge=0, le=30)
    reminder_days: list[int] = Field(default_factory=lambda: [3, 1])
    is_active: bool = True
    next_due_date: date | None = None
    vendor_ref: str | None = Field(None, max_length=100)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)


class BillUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(None, max_length=100)
    description: str | None = None
    category_id: uuid.UUID | None = None
    amount: int | None = Field(None, gt=0)
    currency: CurrencyCode | None = None
    due_day: int | None = Field(None, ge=1, le=31)
    frequency: RecurrenceFrequency | None = None
    pay_from_account_id: uuid.UUID | None = None
    auto_pay: bool | None = None
    auto_pay_days_before: int | None = Field(None, ge=0, le=30)
    reminder_days: list[int] | None = None
    is_active: bool | None = None
    next_due_date: date | None = None
    vendor_ref: str | None = Field(None, max_length=100)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)


@router.get("/")
async def list_bills(
    is_active: bool | None = None,
    bill_status: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    stmt = select(Bill)
    if ctx.is_family:
        stmt = stmt.where(Bill.family_id == ctx.family_id)
    else:
        stmt = stmt.where(Bill.user_id == user.id, Bill.family_id.is_(None))
    if is_active is not None:
        stmt = stmt.where(Bill.is_active == is_active)
    if bill_status is not None:
        stmt = stmt.where(Bill.status == bill_status)
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Bill.id < cursor_uuid)
    stmt = stmt.order_by(Bill.created_at.desc(), Bill.id.desc())
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    bills = list(result.scalars().all())

    next_cursor = None
    if len(bills) > limit:
        bills = bills[:limit]
        next_cursor = str(bills[-1].id)

    return {
        "items": [_to_dict(b) for b in bills],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.post("/", status_code=201)
async def create_bill(
    data: BillCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("bills:manage:create"),
) -> dict:
    require_permission(ctx, "can_edit_budgets")
    bill = Bill(user_id=user.id, family_id=ctx.family_id, **data.model_dump(exclude_unset=True))
    db.add(bill)
    await db.flush()
    await db.refresh(bill)
    return _to_dict(bill)


@router.put("/{bill_id}")
async def update_bill(
    bill_id: uuid.UUID,
    data: BillUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_edit_budgets")
    bill = await _get_or_404(db, bill_id, user.id, family_id=ctx.family_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(bill, key, value)
    await db.flush()
    await db.refresh(bill)
    return _to_dict(bill)


@router.delete("/{bill_id}", status_code=204)
async def delete_bill(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_edit_budgets")
    bill = await _get_or_404(db, bill_id, user.id, family_id=ctx.family_id)
    await db.delete(bill)


@router.post("/{bill_id}/pay")
async def pay_bill(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("bills:pay:create"),
) -> dict:
    """Marcar conta como paga."""
    require_permission(ctx, "can_edit_budgets")
    bill = await _get_or_404(db, bill_id, user.id, family_id=ctx.family_id)

    # Debit linked account and create transaction if account is set
    if bill.pay_from_account_id:
        account = await db.get(Account, bill.pay_from_account_id)
        if account:
            account.balance -= bill.amount

            txn = Transaction(
                user_id=user.id,
                account_id=bill.pay_from_account_id,
                category_id=bill.category_id,
                amount=bill.amount,
                type=TransactionType.EXPENSE,
                description=f"Pago: {bill.name}",
                transaction_date=date.today(),
                source_type="bill_payment",
                source_id=bill.id,
            )
            db.add(txn)

    bill.status = BillStatus.PAID
    bill.last_paid_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(bill)
    return _to_dict(bill)


async def _get_or_404(
    db: AsyncSession,
    bill_id: uuid.UUID,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Bill:
    stmt = select(Bill).where(Bill.id == bill_id)
    if family_id is not None:
        stmt = stmt.where(Bill.family_id == family_id)
    else:
        stmt = stmt.where(Bill.user_id == user_id, Bill.family_id.is_(None))
    result = await db.execute(stmt)
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Conta a pagar não encontrada"},
        )
    return bill


def _to_dict(bill: Bill) -> dict:
    return {
        "id": bill.id,
        "user_id": bill.user_id,
        "family_id": bill.family_id,
        "name": bill.name,
        "description": bill.description,
        "category_id": bill.category_id,
        "amount": bill.amount,
        "currency": bill.currency,
        "due_day": bill.due_day,
        "frequency": bill.frequency,
        "pay_from_account_id": bill.pay_from_account_id,
        "auto_pay": bill.auto_pay,
        "auto_pay_days_before": bill.auto_pay_days_before,
        "reminder_days": bill.reminder_days,
        "status": bill.status,
        "is_active": bill.is_active,
        "last_paid_at": bill.last_paid_at,
        "next_due_date": bill.next_due_date,
        "vendor_ref": bill.vendor_ref,
        "icon": bill.icon,
        "color": bill.color,
        "created_at": bill.created_at,
        "updated_at": bill.updated_at,
    }
