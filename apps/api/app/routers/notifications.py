"""Notifications router: CRUD + mark read + scheduler trigger."""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.notification import Notification
from app.models.user import User
from app.services.notification_scheduler import (
    run_notification_scheduler,
    run_notification_scheduler_for_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("/")
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Notification.id < cursor_uuid)
    stmt = stmt.order_by(Notification.created_at.desc(), Notification.id.desc())
    stmt = stmt.limit(limit + 1)

    result = await db.execute(stmt)
    notifications = list(result.scalars().all())

    next_cursor = None
    if len(notifications) > limit:
        notifications = notifications[:limit]
        next_cursor = str(notifications[-1].id)

    items = [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "data": n.data,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]

    return {
        "items": items,
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from sqlalchemy import func

    result = await db.execute(
        select(func.count()).where(
            Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    )
    count = result.scalar() or 0
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user.id)
        .values(is_read=True, read_at=datetime.now(UTC))
    )
    await db.flush()
    return {"success": True}


@router.put("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.now(UTC))
    )
    await db.flush()
    return {"success": True}


@router.post("/check")
async def trigger_notification_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> dict:
    """Verificação de notificações.

    - Com SERVICE_TOKEN: executa para TODOS os utilizadores (cron job).
    - Com JWT de utilizador: executa apenas para esse utilizador.
    - Sem autenticação válida: retorna 401.
    """
    service_token = request.headers.get("X-Service-Token") or ""
    has_valid_service_token = (
        bool(settings.service_token) and service_token == settings.service_token
    )

    if has_valid_service_token:
        logger.info("Verificação de notificações via cron (todos os utilizadores)")
        return await run_notification_scheduler(db)

    if user is not None:
        logger.info("Verificação de notificações para utilizador %s", user.id)
        return await run_notification_scheduler_for_user(db, user.id)

    raise HTTPException(status_code=401, detail="Autenticação necessária")
