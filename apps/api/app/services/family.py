"""Family service: CRUD, invites, members, spending."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import FamilyRole, TransactionType
from app.models.family import Family, FamilyInvite, FamilyMember
from app.models.transaction import Transaction
from app.schemas.family import FamilyCreate, FamilyUpdate


async def get_user_family(db: AsyncSession, user_id: uuid.UUID) -> Family | None:
    """Get the family the user belongs to."""
    result = await db.execute(
        select(FamilyMember.family_id).where(
            FamilyMember.user_id == user_id, FamilyMember.is_active.is_(True)
        )
    )
    family_id = result.scalar_one_or_none()
    if not family_id:
        return None
    result = await db.execute(select(Family).where(Family.id == family_id))
    return result.scalar_one_or_none()


async def get_family(db: AsyncSession, family_id: uuid.UUID) -> Family | None:
    result = await db.execute(select(Family).where(Family.id == family_id))
    return result.scalar_one_or_none()


async def create_family(db: AsyncSession, user_id: uuid.UUID, data: FamilyCreate) -> Family:
    family = Family(name=data.name, admin_user_id=user_id)
    db.add(family)
    await db.flush()

    # Add creator as admin member
    member = FamilyMember(
        family_id=family.id, user_id=user_id, role=FamilyRole.ADMIN,
    )
    db.add(member)
    await db.flush()
    await db.refresh(family, ["members"])
    return family


async def update_family(db: AsyncSession, family: Family, data: FamilyUpdate) -> Family:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(family, field, value)
    await db.flush()
    return family


async def delete_family(db: AsyncSession, family: Family) -> None:
    await db.delete(family)
    await db.flush()


async def is_family_admin(db: AsyncSession, family_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
            FamilyMember.role == FamilyRole.ADMIN,
        )
    )
    return result.scalar_one_or_none() is not None


async def is_family_member(db: AsyncSession, family_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
            FamilyMember.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none() is not None


async def create_invite(
    db: AsyncSession, family_id: uuid.UUID, invited_by: uuid.UUID,
    phone: str | None, email: str | None, role: FamilyRole,
) -> FamilyInvite:
    invite = FamilyInvite(
        family_id=family_id,
        invited_by=invited_by,
        invite_phone=phone,
        invite_email=email,
        role=role,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(invite)
    await db.flush()
    return invite


async def accept_invite_by_code(
    db: AsyncSession, invite_code: str, user_id: uuid.UUID
) -> FamilyMember | None:
    """Accept an invite using the family's invite code."""
    result = await db.execute(select(Family).where(Family.invite_code == invite_code))
    family = result.scalar_one_or_none()
    if not family:
        return None

    # Check if already a member
    if await is_family_member(db, family.id, user_id):
        return None

    member = FamilyMember(
        family_id=family.id, user_id=user_id, role=FamilyRole.ADULT,
    )
    db.add(member)
    await db.flush()
    return member


async def update_member_role(
    db: AsyncSession, member_id: uuid.UUID, role: FamilyRole
) -> FamilyMember | None:
    result = await db.execute(select(FamilyMember).where(FamilyMember.id == member_id))
    member = result.scalar_one_or_none()
    if member:
        member.role = role
        await db.flush()
    return member


async def remove_member(db: AsyncSession, member_id: uuid.UUID) -> None:
    result = await db.execute(select(FamilyMember).where(FamilyMember.id == member_id))
    member = result.scalar_one_or_none()
    if member:
        member.is_active = False
        await db.flush()


async def get_family_spending(
    db: AsyncSession, family_id: uuid.UUID, days: int = 30
) -> list[dict]:
    """Get spending breakdown by family member."""
    from app.models.user import User

    # Get family members
    result = await db.execute(
        select(FamilyMember.user_id, User.name)
        .join(User, FamilyMember.user_id == User.id)
        .where(FamilyMember.family_id == family_id, FamilyMember.is_active.is_(True))
    )
    members = result.all()

    spending = []
    from datetime import date
    from datetime import timedelta as td

    date_from = date.today() - td(days=days)

    for member_user_id, member_name in members:
        result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.user_id == member_user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= date_from,
                Transaction.is_private.is_(False),
            )
        )
        total = result.scalar() or 0
        spending.append({
            "user_id": str(member_user_id),
            "name": member_name,
            "total_spent": total,
        })

    return spending
