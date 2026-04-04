"""Cost tracking per agent per session.

Tracks token usage and estimated USD cost per agent and per session.
Stored in Redis with daily aggregation.
"""

import logging
import uuid
from datetime import date

from app.services.otp import get_redis

logger = logging.getLogger(__name__)

# Pricing per 1M tokens (input / output) — approximate
MODEL_PRICING = {
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},
    "claude-opus-4-6": {"input": 5.0, "output": 25.0},
    "gpt-4o": {"input": 2.5, "output": 10.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "text-embedding-3-small": {"input": 0.02, "output": 0.0},
}


def estimate_cost(model: str, tokens_input: int, tokens_output: int) -> float:
    """Estimate USD cost for a request."""
    pricing = MODEL_PRICING.get(model, {"input": 3.0, "output": 15.0})
    input_cost = (tokens_input / 1_000_000) * pricing["input"]
    output_cost = (tokens_output / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


async def track_agent_cost(
    user_id: uuid.UUID,
    agent_name: str,
    model: str,
    tokens_input: int,
    tokens_output: int,
) -> None:
    """Track cost for a specific agent call."""
    cost = estimate_cost(model, tokens_input, tokens_output)
    today = date.today().isoformat()

    try:
        r = await get_redis()

        # Per-agent daily cost
        agent_key = f"cost:{user_id}:{today}:{agent_name}"
        await r.incrbyfloat(agent_key, cost)
        await r.expire(agent_key, 86400 * 7)  # Keep 7 days

        # Per-agent daily tokens
        tokens_key = f"tokens:{user_id}:{today}:{agent_name}"
        await r.incrby(tokens_key, tokens_input + tokens_output)
        await r.expire(tokens_key, 86400 * 7)

        # Per-agent call count
        calls_key = f"calls:{user_id}:{today}:{agent_name}"
        await r.incr(calls_key)
        await r.expire(calls_key, 86400 * 7)

        # Total daily cost (all agents)
        total_key = f"cost:{user_id}:{today}:total"
        await r.incrbyfloat(total_key, cost)
        await r.expire(total_key, 86400 * 7)

    except Exception:
        logger.debug("Cost tracking failed")


async def get_session_cost_summary(user_id: uuid.UUID) -> dict:
    """Get cost summary for today's session."""
    today = date.today().isoformat()
    try:
        r = await get_redis()

        # Get total
        total_cost = await r.get(f"cost:{user_id}:{today}:total")

        # Get per-agent breakdown
        agents = [
            "tracker", "advisor", "budget", "goals", "family",
            "report", "debt", "investment", "news", "general",
        ]
        breakdown = {}
        for agent in agents:
            cost = await r.get(f"cost:{user_id}:{today}:{agent}")
            tokens = await r.get(f"tokens:{user_id}:{today}:{agent}")
            calls = await r.get(f"calls:{user_id}:{today}:{agent}")
            if cost or tokens or calls:
                breakdown[agent] = {
                    "cost_usd": float(cost) if cost else 0,
                    "tokens": int(tokens) if tokens else 0,
                    "calls": int(calls) if calls else 0,
                }

        return {
            "date": today,
            "total_cost_usd": float(total_cost) if total_cost else 0,
            "agents": breakdown,
        }
    except Exception:
        return {"date": today, "total_cost_usd": 0, "agents": {}}
