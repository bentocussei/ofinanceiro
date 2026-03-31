"""FastAPI dependencies: DB session, current user, rate limiting, service token."""

import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.auth import decode_access_token, get_user_by_id

logger = logging.getLogger(__name__)

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT from Authorization header. Returns the authenticated user."""
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token inválido ou expirado"},
        )

    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND", "message": "Utilizador não encontrado"},
        )

    return user


async def verify_service_token(request: Request) -> None:
    """Validate X-Service-Token header or Bearer token for cron job authentication."""
    token = request.headers.get("X-Service-Token") or request.headers.get(
        "Authorization", ""
    ).replace("Bearer ", "")

    if not settings.service_token or token != settings.service_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de serviço inválido",
        )


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Try to extract user from JWT. Returns None if no valid auth present.

    Used in endpoints that accept EITHER user auth OR service token.
    """
    if credentials is None:
        return None

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        return None

    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        return None

    return user


__all__ = [
    "get_db",
    "get_current_user",
    "verify_service_token",
    "get_optional_user",
]
