"""Tools introspection router — GET /api/v1/tools."""

from fastapi import APIRouter, Depends

from app.ai.tools import ToolRegistry
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/tools", tags=["tools"])


@router.get("")
async def list_tools(
    user: User = Depends(get_current_user),
) -> list[dict]:
    """List all registered agent tools with metadata."""
    registry = ToolRegistry.instance()
    return [
        {
            "name": t.name,
            "description": t.description,
            "agent": t.agent,
            "category": t.category,
            "read_only": t.read_only,
            "version": t.version,
        }
        for t in sorted(registry.get_all(), key=lambda t: (t.agent, t.name))
    ]
