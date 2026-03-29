"""Insights router: get proactive financial insights."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.insights.engine import generate_insights
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])


@router.get("/")
async def get_insights(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    """Get proactive financial insights for the user (max 2)."""
    return await generate_insights(db, user.id)
