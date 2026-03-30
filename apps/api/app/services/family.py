"""Family service: CRUD, invites, members, join requests, spending."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import FamilyRole, NotificationType, TransactionType
from app.models.family import Family, FamilyInvite, FamilyMember
from app.models.notification import Notification
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.family import FamilyCreate, FamilyUpdate, MemberUpdate
from app.services.auth import hash_password


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
    family = Family(
        name=data.name,
        admin_user_id=user_id,
        currency=data.currency,
        month_start_day=data.month_start_day,
    )
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
            FamilyMember.is_active.is_(True),
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


async def get_user_member(db: AsyncSession, family_id: uuid.UUID, user_id: uuid.UUID) -> FamilyMember | None:
    """Get the FamilyMember record for a user in a family."""
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
            FamilyMember.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


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


# --- Regenerate invite code ---


async def regenerate_invite_code(db: AsyncSession, family: Family) -> str:
    """Generate a new unique invite code for the family."""
    for _ in range(10):  # Max retries for uniqueness
        new_code = secrets.token_urlsafe(12)
        result = await db.execute(
            select(Family.id).where(Family.invite_code == new_code)
        )
        if result.scalar_one_or_none() is None:
            family.invite_code = new_code
            await db.flush()
            return new_code
    # Extremely unlikely fallback
    raise ValueError("Não foi possível gerar um código único")


# --- Join request flow ---


async def create_join_request(
    db: AsyncSession, invite_code: str, user: User,
) -> FamilyInvite | None:
    """Create a pending join request using the family's invite code."""
    result = await db.execute(select(Family).where(Family.invite_code == invite_code))
    family = result.scalar_one_or_none()
    if not family:
        return None

    # Check if already a member
    if await is_family_member(db, family.id, user.id):
        return None

    # Check if already has a pending request
    result = await db.execute(
        select(FamilyInvite).where(
            FamilyInvite.family_id == family.id,
            FamilyInvite.user_id == user.id,
            FamilyInvite.status == "pending",
        )
    )
    if result.scalar_one_or_none():
        return None  # Already has pending request

    invite = FamilyInvite(
        family_id=family.id,
        user_id=user.id,
        invited_by=None,
        invite_phone=user.phone,
        role=FamilyRole.ADULT,
        status="pending",
    )
    db.add(invite)
    await db.flush()

    # Notify all admin members
    await _notify_family_admins(
        db,
        family.id,
        NotificationType.FAMILY_JOIN_REQUEST,
        title="Novo pedido de integração",
        body=f"Novo pedido de integração de {user.name}",
        data={"invite_id": str(invite.id), "user_name": user.name},
    )

    return invite


async def get_join_requests(
    db: AsyncSession, family_id: uuid.UUID,
) -> list[dict]:
    """Get all pending join requests for a family with user info."""
    result = await db.execute(
        select(FamilyInvite, User.name, User.phone)
        .outerjoin(User, FamilyInvite.user_id == User.id)
        .where(
            FamilyInvite.family_id == family_id,
            FamilyInvite.status == "pending",
        )
        .order_by(FamilyInvite.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": invite.id,
            "family_id": invite.family_id,
            "user_id": invite.user_id,
            "invite_phone": invite.invite_phone or phone,
            "status": invite.status,
            "created_at": invite.created_at,
            "user_name": name,
        }
        for invite, name, phone in rows
    ]


async def approve_join_request(
    db: AsyncSession, family_id: uuid.UUID, invite_id: uuid.UUID,
) -> FamilyMember | None:
    """Approve a pending join request and create a family member."""
    result = await db.execute(
        select(FamilyInvite).where(
            FamilyInvite.id == invite_id,
            FamilyInvite.family_id == family_id,
            FamilyInvite.status == "pending",
        )
    )
    invite = result.scalar_one_or_none()
    if not invite or not invite.user_id:
        return None

    invite.status = "approved"
    await db.flush()

    member = FamilyMember(
        family_id=family_id,
        user_id=invite.user_id,
        role=FamilyRole.ADULT,
    )
    db.add(member)
    await db.flush()

    # Notify the requester
    family = await get_family(db, family_id)
    family_name = family.name if family else "a família"
    notification = Notification(
        user_id=invite.user_id,
        type=NotificationType.FAMILY_JOIN_RESPONSE,
        title="Pedido aprovado",
        body=f"O seu pedido para {family_name} foi aprovado",
        data={"family_id": str(family_id), "status": "approved"},
    )
    db.add(notification)
    await db.flush()

    return member


async def reject_join_request(
    db: AsyncSession, family_id: uuid.UUID, invite_id: uuid.UUID,
) -> bool:
    """Reject a pending join request."""
    result = await db.execute(
        select(FamilyInvite).where(
            FamilyInvite.id == invite_id,
            FamilyInvite.family_id == family_id,
            FamilyInvite.status == "pending",
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        return False

    invite.status = "rejected"
    await db.flush()

    # Notify the requester
    if invite.user_id:
        family = await get_family(db, family_id)
        family_name = family.name if family else "a família"
        notification = Notification(
            user_id=invite.user_id,
            type=NotificationType.FAMILY_JOIN_RESPONSE,
            title="Pedido recusado",
            body=f"O seu pedido para {family_name} foi recusado",
            data={"family_id": str(family_id), "status": "rejected"},
        )
        db.add(notification)
        await db.flush()

    return True


# --- Direct member creation ---


async def create_direct_member(
    db: AsyncSession,
    family_id: uuid.UUID,
    name: str,
    phone: str,
    password: str,
    role: FamilyRole,
    family_relation: "FamilyRelation | None",
    display_name: str | None,
) -> FamilyMember:
    """Create a new user and add them directly as a family member."""
    from app.models.enums import FamilyRelation  # noqa: F811

    # Check phone uniqueness
    result = await db.execute(select(User).where(User.phone == phone))
    if result.scalar_one_or_none():
        raise ValueError("PHONE_EXISTS")

    new_user = User(
        name=name,
        phone=phone,
        password_hash=hash_password(password),
    )
    db.add(new_user)
    await db.flush()

    member = FamilyMember(
        family_id=family_id,
        user_id=new_user.id,
        role=role,
        family_relation=family_relation,
        display_name=display_name,
    )
    db.add(member)
    await db.flush()
    return member


# --- Leave family ---


async def leave_family(
    db: AsyncSession, family_id: uuid.UUID, user_id: uuid.UUID,
) -> bool:
    """User leaves their family. Returns False if cannot leave (sole admin)."""
    member = await get_user_member(db, family_id, user_id)
    if not member:
        return False

    # If admin, check there's another admin
    if member.role == FamilyRole.ADMIN:
        result = await db.execute(
            select(func.count(FamilyMember.id)).where(
                FamilyMember.family_id == family_id,
                FamilyMember.role == FamilyRole.ADMIN,
                FamilyMember.is_active.is_(True),
            )
        )
        admin_count = result.scalar() or 0
        if admin_count <= 1:
            return False

    member.is_active = False
    await db.flush()
    return True


# --- Update member ---


async def update_member(
    db: AsyncSession, member_id: uuid.UUID, data: MemberUpdate,
) -> FamilyMember | None:
    """Update a family member's display name, relation, and permissions."""
    result = await db.execute(select(FamilyMember).where(FamilyMember.id == member_id))
    member = result.scalar_one_or_none()
    if not member:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(member, field, value)
    await db.flush()
    return member


# --- Existing endpoints ---


async def accept_invite_by_code(
    db: AsyncSession, invite_code: str, user_id: uuid.UUID
) -> FamilyMember | None:
    """Accept an invite using the family's invite code (legacy — kept for compatibility)."""
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


# --- Internal helpers ---


async def _notify_family_admins(
    db: AsyncSession,
    family_id: uuid.UUID,
    notification_type: NotificationType,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """Send a notification to all active admin members of a family."""
    result = await db.execute(
        select(FamilyMember.user_id).where(
            FamilyMember.family_id == family_id,
            FamilyMember.role == FamilyRole.ADMIN,
            FamilyMember.is_active.is_(True),
        )
    )
    admin_user_ids = result.scalars().all()

    for admin_user_id in admin_user_ids:
        notification = Notification(
            user_id=admin_user_id,
            type=notification_type,
            title=title,
            body=body,
            data=data or {},
        )
        db.add(notification)
    await db.flush()
