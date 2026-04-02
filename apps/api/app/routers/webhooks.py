"""Webhook endpoints for third-party integrations (e.g. Biometrid)."""

import logging

from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/biometrid")
async def biometrid_webhook(request: Request) -> dict:
    """Receive Biometrid verification callback and log the full payload."""
    body = await request.json()
    headers = dict(request.headers)

    logger.info("=" * 60)
    logger.info("BIOMETRID WEBHOOK RECEIVED")
    logger.info("=" * 60)
    logger.info("Headers: %s", headers)
    logger.info("Body: %s", body)
    logger.info("=" * 60)

    # Also print to stdout for Railway logs
    print("=" * 60)  # noqa: T201
    print("BIOMETRID WEBHOOK RECEIVED")  # noqa: T201
    print(f"Headers: {headers}")  # noqa: T201
    print(f"Body: {body}")  # noqa: T201
    print("=" * 60)  # noqa: T201

    return {"status": "received"}
