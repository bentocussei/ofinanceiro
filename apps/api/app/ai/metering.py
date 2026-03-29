"""Token metering — tracks LLM token usage per user for cost management and quotas."""

import logging
import uuid
from datetime import date

from app.services.otp import get_redis

logger = logging.getLogger(__name__)

# Daily quota limits per plan (total tokens in + out)
PLAN_DAILY_LIMITS = {
    "free": 5_000,       # ~5 AI questions per day
    "personal": 50_000,  # ~50 questions per day
    "family": 80_000,    # ~80 questions per day
    "family_plus": 150_000,  # ~150 questions per day
}


def _usage_key(user_id: uuid.UUID) -> str:
    today = date.today().isoformat()
    return f"token_usage:{user_id}:{today}"


async def record_token_usage(
    user_id: uuid.UUID,
    tokens_input: int,
    tokens_output: int,
) -> None:
    """Record token usage for a user. Resets daily."""
    try:
        r = await get_redis()
        key = _usage_key(user_id)
        total = tokens_input + tokens_output
        await r.incrby(key, total)
        await r.expire(key, 86400)  # Expire after 24h
    except Exception:
        logger.exception("Failed to record token usage")


async def get_daily_usage(user_id: uuid.UUID) -> int:
    """Get today's token usage for a user."""
    try:
        r = await get_redis()
        usage = await r.get(_usage_key(user_id))
        return int(usage) if usage else 0
    except Exception:
        return 0


async def check_quota(user_id: uuid.UUID, plan: str) -> bool:
    """Check if user is within their daily token quota.
    Returns True if they can continue, False if quota exceeded.
    """
    limit = PLAN_DAILY_LIMITS.get(plan, PLAN_DAILY_LIMITS["free"])
    usage = await get_daily_usage(user_id)
    return usage < limit


async def get_quota_info(user_id: uuid.UUID, plan: str) -> dict:
    """Get quota information for a user."""
    limit = PLAN_DAILY_LIMITS.get(plan, PLAN_DAILY_LIMITS["free"])
    usage = await get_daily_usage(user_id)
    return {
        "plan": plan,
        "daily_limit": limit,
        "used_today": usage,
        "remaining": max(0, limit - usage),
        "percentage_used": round(usage / limit * 100, 1) if limit > 0 else 100,
    }
