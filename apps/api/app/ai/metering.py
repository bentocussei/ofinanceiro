"""AI metering — tracks message count and token usage per user for quotas.

Quota is based on MESSAGES per day (not tokens) — a message is one
user question + assistant response. Token tracking remains for cost analytics.
"""

import logging
import uuid
from datetime import date

from app.services.otp import get_redis

logger = logging.getLogger(__name__)

# Daily quota: number of AI MESSAGES (question + answer = 1 message)
PLAN_DAILY_MESSAGE_LIMITS = {
    "free": 10,           # 10 conversations per day
    "personal": 100,      # 100 conversations per day
    "family": 200,        # 200 conversations per day (shared across family)
    "family_plus": 500,   # 500 conversations per day
}


def _message_count_key(user_id: uuid.UUID) -> str:
    today = date.today().isoformat()
    return f"msg_count:{user_id}:{today}"


def _token_usage_key(user_id: uuid.UUID) -> str:
    today = date.today().isoformat()
    return f"token_usage:{user_id}:{today}"


async def record_token_usage(
    user_id: uuid.UUID,
    tokens_input: int,
    tokens_output: int,
) -> None:
    """Record token usage and increment message count."""
    try:
        r = await get_redis()

        # Increment message count
        msg_key = _message_count_key(user_id)
        await r.incr(msg_key)
        await r.expire(msg_key, 86400)

        # Track tokens for cost analytics
        tok_key = _token_usage_key(user_id)
        total = tokens_input + tokens_output
        await r.incrby(tok_key, total)
        await r.expire(tok_key, 86400)
    except Exception:
        logger.debug("Failed to record usage")


async def get_daily_message_count(user_id: uuid.UUID) -> int:
    """Get today's message count for a user."""
    try:
        r = await get_redis()
        count = await r.get(_message_count_key(user_id))
        return int(count) if count else 0
    except Exception:
        return 0


async def get_daily_token_usage(user_id: uuid.UUID) -> int:
    """Get today's token usage for a user (for analytics)."""
    try:
        r = await get_redis()
        usage = await r.get(_token_usage_key(user_id))
        return int(usage) if usage else 0
    except Exception:
        return 0


async def check_quota(user_id: uuid.UUID, plan: str) -> bool:
    """Check if user is within their daily message quota.

    Returns True if they can continue, False if quota exceeded.
    """
    limit = PLAN_DAILY_MESSAGE_LIMITS.get(plan, PLAN_DAILY_MESSAGE_LIMITS["free"])
    count = await get_daily_message_count(user_id)
    return count < limit


async def get_quota_info(user_id: uuid.UUID, plan: str) -> dict:
    """Get quota information for a user."""
    limit = PLAN_DAILY_MESSAGE_LIMITS.get(plan, PLAN_DAILY_MESSAGE_LIMITS["free"])
    count = await get_daily_message_count(user_id)
    tokens = await get_daily_token_usage(user_id)
    return {
        "plan": plan,
        "daily_message_limit": limit,
        "messages_today": count,
        "messages_remaining": max(0, limit - count),
        "tokens_today": tokens,
        "percentage_used": round(count / limit * 100, 1) if limit > 0 else 100,
    }
