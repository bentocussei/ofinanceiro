"""Bills router: CRUD + marcar como pago."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.bill import Bill
from app.models.enums import BillStatus
from app.models.user import User

router = APIRouter(prefix="/api/v1/bills", tags=["bills"])


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
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("bills:manage:create"),
) -> dict:
    require_permission(ctx, "can_edit_budgets")
    bill = Bill(user_id=user.id, family_id=ctx.family_id, **data)
    db.add(bill)
    await db.flush()
    await db.refresh(bill)
    return _to_dict(bill)


@router.put("/{bill_id}")
async def update_bill(
    bill_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    require_permission(ctx, "can_edit_budgets")
    bill = await _get_or_404(db, bill_id, user.id, family_id=ctx.family_id)
    for key, value in data.items():
        if hasattr(bill, key):
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
