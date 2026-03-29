"""LLM response cache using Redis.

L1 — Exact match cache: identical queries cached for 1 hour
L3 — Computed data cache: totals, summaries cached for 5 minutes
"""

import hashlib
import json
import logging

from app.services.otp import get_redis

logger = logging.getLogger(__name__)

L1_TTL = 3600  # 1 hour
L3_TTL = 300  # 5 minutes


def _cache_key(prefix: str, content: str) -> str:
    content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
    return f"cache:{prefix}:{content_hash}"


async def get_cached_response(user_id: str, message: str) -> str | None:
    """Check L1 cache for an exact response match."""
    try:
        r = await get_redis()
        key = _cache_key(f"l1:{user_id}", message.lower().strip())
        cached = await r.get(key)
        if cached:
            logger.debug("L1 cache hit for: %s", message[:50])
            return cached
    except Exception:
        pass
    return None


async def set_cached_response(user_id: str, message: str, response: str) -> None:
    """Store response in L1 cache."""
    try:
        r = await get_redis()
        key = _cache_key(f"l1:{user_id}", message.lower().strip())
        await r.setex(key, L1_TTL, response)
    except Exception:
        pass


async def get_cached_data(key: str) -> dict | None:
    """Get computed data from L3 cache."""
    try:
        r = await get_redis()
        cached = await r.get(f"cache:l3:{key}")
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    return None


async def set_cached_data(key: str, data: dict) -> None:
    """Store computed data in L3 cache."""
    try:
        r = await get_redis()
        await r.setex(f"cache:l3:{key}", L3_TTL, json.dumps(data))
    except Exception:
        pass
