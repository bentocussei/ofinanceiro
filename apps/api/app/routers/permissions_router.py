"""Permissions router: returns current user's effective permissions."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.permission import get_user_permissions

router = APIRouter(prefix="/api/v1/permissions", tags=["permissions"])


@router.get("/mine")
async def get_my_permissions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Return the current user's effective permission codes."""
    perms = await get_user_permissions(db, user.id)
    return {"permissions": sorted(perms)}
