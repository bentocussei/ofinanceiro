"""Auto-billing service: renew subscriptions via their default payment method."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SubscriptionStatus
from app.models.subscription import UserSubscription
from app.services import payment as payment_service

logger = logging.getLogger(__name__)

MAX_RETRY_DAYS = 7  # After 7 days of failed payments, expire the subscription


async def process_renewals(db: AsyncSession) -> dict:
    """Process all subscriptions due for renewal.

    Called daily by cron job. Charges subscriptions where:
    - auto_renew is True
    - end_date is within the next 3 days
    - status is ACTIVE or PAST_DUE
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=3)

    # Find subscriptions due for renewal
    result = await db.scalars(
        select(UserSubscription)
        .where(
            UserSubscription.auto_renew.is_(True),
            UserSubscription.end_date <= cutoff,
            UserSubscription.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PAST_DUE,
            ]),
        )
        .with_for_update(skip_locked=True)
    )
    subscriptions = list(result.all())

    stats = {"total": len(subscriptions), "success": 0, "failed": 0, "expired": 0}
    logger.info("Auto-billing: %d subscricoes para renovar", stats["total"])

    for sub in subscriptions:
        try:
            # Check if PAST_DUE for too long — expire it
            if sub.status == SubscriptionStatus.PAST_DUE:
                days_overdue = (now - sub.end_date).days
                if days_overdue > MAX_RETRY_DAYS:
                    sub.status = SubscriptionStatus.EXPIRED
                    stats["expired"] += 1
                    logger.info("Subscricao %s expirada (overdue %d dias)", sub.id, days_overdue)
                    continue

            # Get default payment method
            pm = await payment_service.get_default_payment_method(db, sub.user_id)
            if not pm:
                sub.status = SubscriptionStatus.PAST_DUE
                stats["failed"] += 1
                logger.warning("Subscricao %s sem metodo de pagamento", sub.id)
                continue

            # Charge
            payment = await payment_service.charge_subscription(db, sub, pm)

            if payment.status.value == "completed":
                # Apply pending plan change if scheduled
                if sub.pending_plan_id:
                    from app.services.billing import apply_pending_change
                    await apply_pending_change(db, sub)
                    logger.info("Subscricao %s: mudanca de plano aplicada", sub.id)

                # Extend subscription period
                if sub.billing_cycle.value == "annual":
                    sub.end_date = sub.end_date + timedelta(days=365)
                else:
                    sub.end_date = sub.end_date + timedelta(days=30)
                sub.start_date = now
                sub.status = SubscriptionStatus.ACTIVE
                sub.proration_credit = 0  # reset proration on renewal
                stats["success"] += 1
                logger.info("Subscricao %s renovada com sucesso", sub.id)
            else:
                sub.status = SubscriptionStatus.PAST_DUE
                stats["failed"] += 1
                logger.warning("Subscricao %s falhou: %s", sub.id, payment.failure_reason)

        except Exception:
            sub.status = SubscriptionStatus.PAST_DUE
            stats["failed"] += 1
            logger.exception("Erro ao renovar subscricao %s", sub.id)

    await db.commit()
    logger.info("Auto-billing concluido: %s", stats)
    return stats
