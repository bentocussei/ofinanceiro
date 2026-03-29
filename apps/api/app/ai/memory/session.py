"""Session memory — stores conversation context in Redis with 24h TTL."""

import json
import uuid

from app.services.otp import get_redis

SESSION_TTL = 86400  # 24 hours
MAX_MESSAGES = 20


def _session_key(user_id: uuid.UUID, session_id: str) -> str:
    return f"chat_session:{user_id}:{session_id}"


async def get_session(user_id: uuid.UUID, session_id: str) -> dict:
    """Get session data from Redis. Returns empty dict if not found or Redis unavailable."""
    try:
        r = await get_redis()
        data = await r.get(_session_key(user_id, session_id))
        if data:
            return json.loads(data)
    except Exception:
        pass  # Redis unavailable — return empty session
    return {"messages": [], "active_agent": None}


async def save_session(
    user_id: uuid.UUID,
    session_id: str,
    messages: list[dict],
    active_agent: str | None = None,
) -> None:
    """Save session to Redis with TTL. Keeps last MAX_MESSAGES messages."""
    try:
        r = await get_redis()
        data = {
            "messages": messages[-MAX_MESSAGES:],
            "active_agent": active_agent,
        }
        await r.setex(
            _session_key(user_id, session_id),
            SESSION_TTL,
            json.dumps(data),
        )
    except Exception:
        pass  # Redis unavailable — session won't be persisted


async def add_message_to_session(
    user_id: uuid.UUID,
    session_id: str,
    role: str,
    content: str,
    agent: str | None = None,
) -> None:
    """Add a message to the session and update TTL."""
    try:
        session = await get_session(user_id, session_id)
        session["messages"].append({"role": role, "content": content})
        if agent:
            session["active_agent"] = agent
        await save_session(user_id, session_id, session["messages"], session["active_agent"])
    except Exception:
        pass  # Redis unavailable


async def clear_session(user_id: uuid.UUID, session_id: str) -> None:
    """Delete a session from Redis."""
    r = await get_redis()
    await r.delete(_session_key(user_id, session_id))
