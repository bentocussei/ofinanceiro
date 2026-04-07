"""Webhook endpoints for third-party integrations (e.g. Biometrid)."""

import logging

from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def _log_biometrid(request: Request) -> dict:
    """Log everything Biometrid sends — headers, query params and body —
    in the most permissive way possible. JSON, form-encoded, plain text and
    empty bodies are all accepted without raising."""
    headers = dict(request.headers)
    query = dict(request.query_params)
    raw = await request.body()

    parsed_body: object
    if not raw:
        parsed_body = None
    else:
        # Try JSON first
        try:
            import json

            parsed_body = json.loads(raw)
        except Exception:
            # Try form-encoded
            try:
                form = await request.form()
                parsed_body = dict(form)
            except Exception:
                # Fall back to raw text
                try:
                    parsed_body = raw.decode("utf-8", errors="replace")
                except Exception:
                    parsed_body = repr(raw)

    method = request.method

    logger.info("=" * 60)
    logger.info("BIOMETRID WEBHOOK RECEIVED (%s)", method)
    logger.info("=" * 60)
    logger.info("Headers: %s", headers)
    logger.info("Query: %s", query)
    logger.info("Body: %s", parsed_body)
    logger.info("=" * 60)

    # Also print to stdout for Railway logs
    print("=" * 60)  # noqa: T201
    print(f"BIOMETRID WEBHOOK RECEIVED ({method})")  # noqa: T201
    print(f"Headers: {headers}")  # noqa: T201
    print(f"Query: {query}")  # noqa: T201
    print(f"Body: {parsed_body}")  # noqa: T201
    print("=" * 60)  # noqa: T201

    return {
        "status": "received",
        "method": method,
        "headers": headers,
        "query": query,
        "body": parsed_body,
    }


@router.post("/biometrid")
async def biometrid_webhook_post(request: Request) -> dict:
    """POST callback from Biometrid. Tolerant to any body shape."""
    return await _log_biometrid(request)


@router.get("/biometrid")
async def biometrid_webhook_get(request: Request) -> dict:
    """GET ping from Biometrid (some integrations verify the URL via GET first)."""
    return await _log_biometrid(request)
