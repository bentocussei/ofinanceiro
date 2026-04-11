"""Broadcast service — send SMS/email/push to user segments.

This is the backend foundation for the future web admin. The actual
sending uses Twilio (SMS), Resend (email), or FCM (push) depending
on the channel. Currently SMS via Twilio is the primary channel.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.broadcast import (
    Broadcast,
    BroadcastAudience,
    BroadcastChannel,
    BroadcastRecipient,
    BroadcastStatus,
)
from app.models.user import User

logger = logging.getLogger(__name__)


async def get_audience_users(
    db: AsyncSession,
    audience: BroadcastAudience,
    custom_user_ids: list[uuid.UUID] | None = None,
) -> list[User]:
    """Resolve audience segment to a list of users."""
    stmt = select(User).where(User.is_active.is_(True))

    if audience == BroadcastAudience.ALL:
        pass  # all active users
    elif audience == BroadcastAudience.ACTIVE:
        threshold = datetime.now(timezone.utc) - timedelta(days=30)
        stmt = stmt.where(User.last_login_at >= threshold)
    elif audience == BroadcastAudience.INACTIVE:
        threshold = datetime.now(timezone.utc) - timedelta(days=30)
        stmt = stmt.where(
            (User.last_login_at < threshold) | (User.last_login_at.is_(None))
        )
    elif audience == BroadcastAudience.CUSTOM:
        if not custom_user_ids:
            return []
        stmt = stmt.where(User.id.in_(custom_user_ids))

    result = await db.scalars(stmt)
    return list(result.all())


async def send_sms_broadcast(
    db: AsyncSession,
    broadcast: Broadcast,
    users: list[User],
) -> dict:
    """Send SMS to a list of users via Twilio.

    In dev mode (no Twilio credentials), logs the messages instead.
    """
    from app.config import settings

    broadcast.status = BroadcastStatus.SENDING
    broadcast.total_recipients = len(users)
    await db.flush()

    delivered = 0
    failed = 0

    for user in users:
        if not user.phone:
            failed += 1
            continue

        recipient = BroadcastRecipient(
            broadcast_id=broadcast.id,
            user_id=user.id,
            phone=user.phone,
        )

        try:
            if settings.twilio_account_sid and settings.twilio_auth_token:
                # Production: send via Twilio
                from twilio.rest import Client

                client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
                msg = client.messages.create(
                    body=broadcast.message,
                    from_=settings.twilio_phone_number,
                    to=user.phone,
                )
                recipient.is_delivered = True
                recipient.delivered_at = datetime.now(timezone.utc)
                delivered += 1
                logger.info("SMS sent to %s: sid=%s", user.phone, msg.sid)
            else:
                # Dev mode: log only
                logger.info(
                    "[DEV SMS] To: %s | Message: %s",
                    user.phone,
                    broadcast.message[:100],
                )
                recipient.is_delivered = True
                recipient.delivered_at = datetime.now(timezone.utc)
                delivered += 1

        except Exception as e:
            recipient.is_delivered = False
            recipient.error_message = str(e)[:500]
            failed += 1
            logger.error("SMS failed to %s: %s", user.phone, e)

        db.add(recipient)

    broadcast.delivered_count = delivered
    broadcast.failed_count = failed
    broadcast.status = BroadcastStatus.SENT
    broadcast.sent_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "total": len(users),
        "delivered": delivered,
        "failed": failed,
    }
