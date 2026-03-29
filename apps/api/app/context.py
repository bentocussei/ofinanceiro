"""Context middleware — determines if request is for personal or family finances.

Usage in routers:
    from app.context import get_context, FinanceContext

    @router.get("/")
    async def list_accounts(
        ctx: FinanceContext = Depends(get_context),
        db: AsyncSession = Depends(get_db),
    ):
        if ctx.is_family:
            # filter by family_id
        else:
            # filter by user_id
"""

import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User


@dataclass
class FinanceContext:
    """Represents the current finance context (personal or family)."""

    user_id: uuid.UUID
    family_id: uuid.UUID | None = None

    @property
    def is_family(self) -> bool:
        return self.family_id is not None

    @property
    def is_personal(self) -> bool:
        return self.family_id is None


async def get_context(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FinanceContext:
    """Extract finance context from X-Context header.

    Header format:
    - "personal" or absent → personal context
    - "family:{family_id}" → family context (verifies membership)
    """
    context_header = request.headers.get("X-Context", "personal")

    if context_header == "personal" or not context_header:
        return FinanceContext(user_id=user.id)

    if context_header.startswith("family:"):
        family_id_str = context_header.split(":", 1)[1]
        try:
            family_id = uuid.UUID(family_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_CONTEXT", "message": "ID de família inválido"},
            )

        # Verify user is a member of this family
        from sqlalchemy import select

        from app.models.family import FamilyMember

        result = await db.execute(
            select(FamilyMember.id).where(
                FamilyMember.family_id == family_id,
                FamilyMember.user_id == user.id,
                FamilyMember.is_active.is_(True),
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "NOT_FAMILY_MEMBER", "message": "Não é membro desta família"},
            )

        return FinanceContext(user_id=user.id, family_id=family_id)

    return FinanceContext(user_id=user.id)
