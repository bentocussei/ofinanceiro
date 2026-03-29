"""Financial score router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import AgentContext
from app.ai.agents.report_agent import ReportAgent
from app.ai.llm.factory import create_llm_router
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/financial-score")
async def get_financial_score(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get the user's financial score (0-100)."""
    agent = ReportAgent(create_llm_router())
    ctx = AgentContext(user_id=user.id, db=db, session_id="score")
    return await agent._get_score(ctx)
