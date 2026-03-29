"""Redis-based rate limiting middleware."""

import time

from fastapi import HTTPException, Request, status

from app.config import settings
from app.services.otp import get_redis


async def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int = 60,
) -> None:
    """Check rate limit using Redis sliding window counter.

    Raises HTTPException 429 if limit exceeded.
    """
    r = await get_redis()
    now = int(time.time())
    window_key = f"ratelimit:{key}:{now // window_seconds}"

    pipe = r.pipeline()
    pipe.incr(window_key)
    pipe.expire(window_key, window_seconds)
    results = await pipe.execute()

    current = results[0]
    if current > max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Demasiados pedidos. Tente novamente em breve.",
            },
        )


async def rate_limit_api(request: Request) -> None:
    """Rate limit for general API: 100 req/min per IP."""
    client_ip = request.client.host if request.client else "unknown"
    await check_rate_limit(f"api:{client_ip}", settings.rate_limit_per_minute)


async def rate_limit_chat(request: Request, user_id: str) -> None:
    """Rate limit for chat: 20 msg/min per user."""
    await check_rate_limit(f"chat:{user_id}", settings.chat_rate_limit_per_minute)
