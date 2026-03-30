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
    role: str | None = None
    can_add_transactions: bool = True
    can_edit_budgets: bool = False
    can_view_all_accounts: bool = False
    can_invite_members: bool = False

    @property
    def is_family(self) -> bool:
        return self.family_id is not None

    @property
    def is_personal(self) -> bool:
        return self.family_id is None


def require_permission(ctx: FinanceContext, permission: str) -> None:
    """Raise 403 if user lacks the required permission in family context.

    In personal context, no restrictions apply.
    In family context, admins always pass; others need the specific flag.
    """
    if not ctx.is_family:
        return
    if ctx.role == "admin":
        return
    if not getattr(ctx, permission, False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "INSUFFICIENT_PERMISSIONS",
                "message": "Não tem permissão para esta acção",
            },
        )


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

        # Verify user is a member of this family and load permissions
        from sqlalchemy import select

        from app.models.family import FamilyMember

        result = await db.execute(
            select(FamilyMember).where(
                FamilyMember.family_id == family_id,
                FamilyMember.user_id == user.id,
                FamilyMember.is_active.is_(True),
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "NOT_FAMILY_MEMBER", "message": "Não é membro desta família"},
            )

        return FinanceContext(
            user_id=user.id,
            family_id=family_id,
            role=member.role.value if member.role else None,
            can_add_transactions=member.can_add_transactions,
            can_edit_budgets=member.can_edit_budgets,
            can_view_all_accounts=member.can_view_all_accounts,
            can_invite_members=member.can_invite_members,
        )

    return FinanceContext(user_id=user.id)
