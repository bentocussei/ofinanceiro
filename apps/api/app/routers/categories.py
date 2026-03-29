"""Categories router: list system + user categories."""

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CategoryResponse]:
    """List all categories: system (global) + user custom ones."""
    stmt = (
        select(Category)
        .where(
            Category.is_active.is_(True),
            or_(Category.is_system.is_(True), Category.user_id == user.id),
        )
        .order_by(Category.sort_order, Category.name)
    )
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return [CategoryResponse.model_validate(c) for c in categories]
