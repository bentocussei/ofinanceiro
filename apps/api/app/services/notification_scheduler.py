"""Notification Scheduler — background service that checks conditions and creates notifications.

Runs periodically (via cron job, FastAPI background task, or manual trigger).
Checks: bills due, low balance, budget alerts, goal milestones, recurring rules.
Creates notifications + optionally sends push/SMS.
"""

import calendar
import logging
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.bill import Bill
from app.models.budget import Budget
from app.models.enums import BillStatus, NotificationType, RecurrenceFrequency, TransactionType
from app.models.goal import Goal
from app.models.notification import Notification
from app.models.recurring_rule import RecurringRule
from app.models.transaction import Transaction
from app.models.user import User

logger = logging.getLogger(__name__)


async def run_notification_scheduler(db: AsyncSession) -> dict:
    """Run all notification checks for all active users. Returns summary."""
    result = await db.execute(select(User.id).where(User.is_active.is_(True)))
    user_ids = [row[0] for row in result.all()]

    total_created = 0
    for user_id in user_ids:
        count = await _check_user_notifications(db, user_id)
        total_created += count

    # Process recurring rules globally (not per-user, query is already filtered)
    recurring_count = await process_recurring_rules(db)

    await db.flush()
    logger.info(
        "Notification scheduler: created %d notifications for %d users, processed %d recurring rules",
        total_created, len(user_ids), recurring_count,
    )
    return {
        "users_checked": len(user_ids),
        "notifications_created": total_created,
        "recurring_rules_processed": recurring_count,
    }


async def run_notification_scheduler_for_user(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Run notification checks for a single user. Returns summary."""
    count = await _check_user_notifications(db, user_id)
    await db.flush()
    logger.info("Notification scheduler (single user %s): created %d notifications", user_id, count)
    return {"users_checked": 1, "notifications_created": count}


async def _check_user_notifications(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Check all notification conditions for a single user."""
    created = 0

    created += await _check_bills_due(db, user_id)
    created += await _check_low_balance(db, user_id)
    created += await _check_budget_alerts(db, user_id)
    created += await _check_goal_milestones(db, user_id)

    return created


async def _create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    notif_type: NotificationType,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """Create a notification if one with same type+title doesn't exist in last 24h."""
    # Avoid duplicates — check if similar notification exists recently
    yesterday = datetime.now(UTC) - timedelta(hours=24)
    result = await db.execute(
        select(Notification.id).where(
            Notification.user_id == user_id,
            Notification.type == notif_type,
            Notification.title == title,
            Notification.created_at >= yesterday,
        ).limit(1)
    )
    if result.scalar_one_or_none():
        return False  # Already notified recently

    notification = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        body=body,
        data=data or {},
    )
    db.add(notification)
    return True


async def _check_bills_due(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Check for bills due in the next 7 days."""
    created = 0
    today = date.today()

    result = await db.execute(
        select(Bill).where(
            Bill.user_id == user_id,
            Bill.is_active.is_(True),
            Bill.status == BillStatus.PENDING,
        )
    )
    bills = result.scalars().all()

    for bill in bills:
        if not bill.next_due_date:
            continue

        days_until = (bill.next_due_date - today).days

        # Remind at configured intervals (default: 7, 3, 1 days before)
        reminder_days = bill.reminder_days or [7, 3, 1]

        if days_until in reminder_days:
            amount_kz = bill.amount / 100 if bill.amount else 0
            if days_until == 0:
                title = f"{bill.name} vence hoje"
                body = f"A sua factura de {amount_kz:,.0f} Kz vence hoje."
            elif days_until == 1:
                title = f"{bill.name} vence amanhã"
                body = f"A sua factura de {amount_kz:,.0f} Kz vence amanhã."
            else:
                title = f"{bill.name} vence em {days_until} dias"
                body = f"A sua factura de {amount_kz:,.0f} Kz vence em {days_until} dias."

            if await _create_notification(
                db, user_id, NotificationType.BILL_REMINDER, title, body,
                {"bill_id": str(bill.id), "days_until": days_until}
            ):
                created += 1

        # Mark overdue
        if days_until < 0 and bill.status == BillStatus.PENDING:
            bill.status = BillStatus.OVERDUE

    return created


async def _check_low_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Check for accounts with balance below threshold."""
    created = 0

    result = await db.execute(
        select(Account).where(
            Account.user_id == user_id,
            Account.is_archived.is_(False),
            Account.low_balance_alert.isnot(None),
        )
    )
    accounts = result.scalars().all()

    for account in accounts:
        if account.balance < account.low_balance_alert:
            balance_kz = account.balance / 100
            threshold_kz = account.low_balance_alert / 100
            title = f"Saldo baixo: {account.name}"
            body = f"O saldo de {account.name} é {balance_kz:,.0f} Kz, abaixo do limite de {threshold_kz:,.0f} Kz."

            if await _create_notification(
                db, user_id, NotificationType.UNUSUAL_SPENDING, title, body,
                {"account_id": str(account.id)}
            ):
                created += 1

    return created


async def _check_budget_alerts(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Check for budgets exceeding alert threshold."""
    created = 0

    result = await db.execute(
        select(Budget).where(
            Budget.user_id == user_id,
            Budget.is_active.is_(True),
            Budget.alert_enabled.is_(True),
        )
    )
    budgets = result.scalars().unique().all()

    for budget in budgets:
        if not budget.total_limit or budget.total_limit == 0:
            continue

        # Calculate total spent
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= budget.period_start,
                Transaction.transaction_date <= budget.period_end,
            )
        )
        total_spent = spent_result.scalar() or 0
        percentage = (total_spent / budget.total_limit * 100) if budget.total_limit > 0 else 0
        threshold = budget.alert_threshold or 80

        if percentage >= threshold:
            budget_name = budget.name or "Mensal"
            if percentage >= 100:
                title = f"Orçamento ultrapassado: {budget_name}"
                body = f"Gastou {percentage:.0f}% do orçamento {budget_name}."
                notif_type = NotificationType.BUDGET_ALERT
            else:
                title = f"Orçamento em risco: {budget_name}"
                body = f"Já utilizou {percentage:.0f}% do orçamento {budget_name}."
                notif_type = NotificationType.BUDGET_ALERT

            if await _create_notification(
                db, user_id, notif_type, title, body,
                {"budget_id": str(budget.id), "percentage": round(percentage, 1)}
            ):
                created += 1

    return created


async def _check_goal_milestones(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Check for goals reaching milestones (25%, 50%, 75%, 100%)."""
    created = 0

    result = await db.execute(
        select(Goal).where(
            Goal.user_id == user_id,
            Goal.status == "active",
        )
    )
    goals = result.scalars().all()

    milestones = [100, 75, 50, 25]

    for goal in goals:
        if goal.target_amount == 0:
            continue

        percentage = (goal.current_amount / goal.target_amount * 100)

        for milestone in milestones:
            if percentage >= milestone:
                title = f"Meta {goal.name}: {milestone}% alcançado!"
                if milestone == 100:
                    body = f"Parabéns! Atingiu a meta de {goal.name}!"
                else:
                    remaining_kz = (goal.target_amount - goal.current_amount) / 100
                    body = f"Já alcançou {milestone}% da meta {goal.name}. Faltam {remaining_kz:,.0f} Kz."

                if await _create_notification(
                    db, user_id, NotificationType.GOAL_MILESTONE, title, body,
                    {"goal_id": str(goal.id), "milestone": milestone}
                ):
                    created += 1
                break  # Only the highest milestone

    return created


def _add_months(d: date, months: int) -> date:
    """Add months to a date, clamping day to last valid day of target month."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _calculate_next_due(current_due: date, frequency: RecurrenceFrequency) -> date:
    """Calculate the next due date based on frequency."""
    match frequency:
        case RecurrenceFrequency.WEEKLY:
            return current_due + timedelta(weeks=1)
        case RecurrenceFrequency.BIWEEKLY:
            return current_due + timedelta(weeks=2)
        case RecurrenceFrequency.MONTHLY:
            return _add_months(current_due, 1)
        case RecurrenceFrequency.QUARTERLY:
            return _add_months(current_due, 3)
        case RecurrenceFrequency.SEMIANNUAL:
            return _add_months(current_due, 6)
        case RecurrenceFrequency.YEARLY:
            return _add_months(current_due, 12)
        case _:
            return _add_months(current_due, 1)


async def process_recurring_rules(db: AsyncSession) -> int:
    """Process all due recurring rules: create transactions and update account balances.

    Returns the count of rules processed.
    """
    today = date.today()

    # Find all active rules that are due
    result = await db.execute(
        select(RecurringRule).where(
            RecurringRule.is_active.is_(True),
            RecurringRule.next_due.isnot(None),
            RecurringRule.next_due <= today,
        )
    )
    rules = list(result.scalars().all())

    processed = 0
    for rule in rules:
        # Skip if end_date has passed
        if rule.end_date and today > rule.end_date:
            rule.is_active = False
            continue

        # Create transaction
        txn = Transaction(
            user_id=rule.user_id,
            account_id=rule.account_id,
            category_id=rule.category_id,
            amount=rule.amount,
            type=rule.type,
            description=rule.description,
            transaction_date=today,
            is_recurring=True,
        )
        db.add(txn)

        # Update account balance
        account = await db.get(Account, rule.account_id)
        if account:
            if rule.type == TransactionType.INCOME:
                account.balance += rule.amount
            elif rule.type == TransactionType.EXPENSE:
                account.balance -= rule.amount

        # Update rule: mark as processed and calculate next due
        rule.last_processed = today
        rule.next_due = _calculate_next_due(rule.next_due, rule.frequency)

        # Deactivate if next_due is past end_date
        if rule.end_date and rule.next_due > rule.end_date:
            rule.is_active = False

        processed += 1

    logger.info("Processed %d recurring rules", processed)
    return processed
