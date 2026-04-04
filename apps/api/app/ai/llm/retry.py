"""Multi-layer retry with exponential backoff and model fallback.

Inspired by Claude Code's withRetry.ts:
- Exponential backoff (500ms base, 32s max)
- 429 (rate limit): respect Retry-After header
- 529 (overload): consecutive failures trigger model fallback
- Connection errors: retry with fresh client
- Auth errors: fail immediately
"""

import asyncio
import logging
import random
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Configuration
MAX_RETRIES = 8
BASE_DELAY_MS = 500
MAX_DELAY_MS = 32_000
MAX_CONSECUTIVE_OVERLOAD = 3  # 529s before fallback


class RetryExhaustedError(Exception):
    """All retry attempts exhausted."""

    def __init__(self, last_error: Exception, attempts: int):
        self.last_error = last_error
        self.attempts = attempts
        super().__init__(f"All {attempts} retry attempts exhausted: {last_error}")


class ModelFallbackTriggered(Exception):
    """Consecutive overload errors — caller should switch to fallback model."""

    def __init__(self, original_model: str, suggested_fallback: str):
        self.original_model = original_model
        self.suggested_fallback = suggested_fallback
        super().__init__(f"Fallback triggered: {original_model} → {suggested_fallback}")


def _calculate_delay(attempt: int, retry_after: float | None = None) -> float:
    """Calculate delay with exponential backoff + jitter."""
    if retry_after is not None and retry_after > 0:
        return min(retry_after, MAX_DELAY_MS / 1000)

    base = min(BASE_DELAY_MS * (2 ** attempt), MAX_DELAY_MS)
    jitter = random.uniform(0, 0.25 * base)
    return (base + jitter) / 1000  # Convert to seconds


def _is_retryable(error: Exception) -> bool:
    """Determine if an error is retryable."""
    error_str = str(error).lower()

    # Rate limit
    if "429" in error_str or "rate" in error_str:
        return True
    # Overload
    if "529" in error_str or "overload" in error_str:
        return True
    # Server errors
    if "500" in error_str or "502" in error_str or "503" in error_str:
        return True
    # Connection errors
    if "connection" in error_str or "timeout" in error_str or "econnreset" in error_str:
        return True

    return False


def _is_overload(error: Exception) -> bool:
    """Check if error is a 529 overload."""
    error_str = str(error).lower()
    return "529" in error_str or "overload" in error_str


def _is_rate_limit(error: Exception) -> bool:
    """Check if error is a 429 rate limit."""
    error_str = str(error).lower()
    return "429" in error_str or "rate_limit" in error_str


def _get_retry_after(error: Exception) -> float | None:
    """Extract Retry-After value from error if available."""
    # Try to get from anthropic error headers
    if hasattr(error, "response") and hasattr(error.response, "headers"):
        retry_after = error.response.headers.get("retry-after")
        if retry_after:
            try:
                return float(retry_after)
            except ValueError:
                pass
    return None


async def with_retry(
    operation: Callable[..., Any],
    *args: Any,
    max_retries: int = MAX_RETRIES,
    fallback_model: str | None = None,
    current_model: str | None = None,
    **kwargs: Any,
) -> Any:
    """Execute an operation with multi-layer retry logic.

    Retry layers:
    1. Exponential backoff for transient errors (429, 5xx, connection)
    2. Respect Retry-After headers from rate limits
    3. Consecutive 529 overloads trigger model fallback
    4. Auth errors (401, 403) fail immediately

    Args:
        operation: Async function to execute
        max_retries: Maximum retry attempts
        fallback_model: Model to suggest on consecutive overloads
        current_model: Current model name (for fallback messaging)

    Returns:
        Result of operation

    Raises:
        ModelFallbackTriggered: When fallback should be used
        RetryExhaustedError: When all retries exhausted
    """
    consecutive_overloads = 0
    last_error: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            result = await operation(*args, **kwargs)
            return result

        except Exception as e:
            last_error = e
            error_str = str(e).lower()

            # Auth errors — don't retry
            if "401" in error_str or "403" in error_str or "authentication" in error_str:
                logger.error("Auth error (no retry): %s", e)
                raise

            # Not retryable — don't retry
            if not _is_retryable(e):
                logger.error("Non-retryable error: %s", e)
                raise

            # Track consecutive overloads
            if _is_overload(e):
                consecutive_overloads += 1
                if consecutive_overloads >= MAX_CONSECUTIVE_OVERLOAD and fallback_model:
                    logger.warning(
                        "%d consecutive overloads — triggering fallback: %s → %s",
                        consecutive_overloads, current_model, fallback_model,
                    )
                    raise ModelFallbackTriggered(
                        current_model or "unknown", fallback_model
                    ) from e
            else:
                consecutive_overloads = 0

            # Last attempt — don't delay, just fail
            if attempt >= max_retries:
                break

            # Calculate delay
            retry_after = _get_retry_after(e)
            delay = _calculate_delay(attempt, retry_after)

            error_type = "overload" if _is_overload(e) else "rate_limit" if _is_rate_limit(e) else "transient"
            logger.warning(
                "Retry %d/%d (%s): waiting %.1fs — %s",
                attempt + 1, max_retries, error_type, delay, str(e)[:100],
            )

            await asyncio.sleep(delay)

    raise RetryExhaustedError(last_error or RuntimeError("Unknown error"), max_retries + 1)
