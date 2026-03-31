"""Permission checking service.

Resolves effective permissions for client users and admin users by
combining plan-based grants, user-level overrides, and admin role grants.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.permission import (
    AdminRolePermission,
    AdminUser,
    AdminUserRevokedPermission,
    Permission,
    PlanPermission,
    UserPermission,
)
from app.models.subscription import UserSubscription
from app.models.enums import SubscriptionStatus
from app.permissions import (
    generate_client_permissions,
    get_permission_label,
    is_client_permission,
)


# ---------------------------------------------------------------------------
# Client permissions
# ---------------------------------------------------------------------------


async def get_user_permissions(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> set[str]:
    """Get all effective permission codes for a client user.

    Resolution order:
    1. Start with permissions from the user's active plan (via PlanPermission)
    2. Add any explicitly granted UserPermission records (source = "addon", "admin")
    3. Remove any explicitly revoked UserPermission records (is_granted = False)
    """
    permissions: set[str] = set()

    # 1. Plan-based permissions from active subscription
    sub_stmt = (
        select(UserSubscription)
        .where(
            UserSubscription.user_id == user_id,
            UserSubscription.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.TRIALING,
            ]),
        )
        .order_by(UserSubscription.created_at.desc())
        .limit(1)
    )
    sub_result = await db.execute(sub_stmt)
    subscription = sub_result.scalar_one_or_none()

    if subscription:
        plan_perm_stmt = (
            select(Permission.code)
            .join(PlanPermission, PlanPermission.permission_id == Permission.id)
            .where(PlanPermission.plan_id == subscription.plan_id)
        )
        plan_result = await db.execute(plan_perm_stmt)
        permissions.update(plan_result.scalars().all())

    # 2 & 3. User-level overrides
    user_perm_stmt = (
        select(UserPermission)
        .options(selectinload(UserPermission.permission))
        .where(UserPermission.user_id == user_id)
    )
    user_perm_result = await db.execute(user_perm_stmt)
    user_perms = user_perm_result.scalars().all()

    for up in user_perms:
        code = up.permission.code
        if up.is_granted:
            permissions.add(code)
        else:
            permissions.discard(code)

    return permissions


async def has_permission(
    db: AsyncSession,
    user_id: uuid.UUID,
    permission_code: str,
) -> bool:
    """Check if a user has a specific permission."""
    permissions = await get_user_permissions(db, user_id)
    return permission_code in permissions


async def sync_user_permissions_from_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_snapshot: dict,
) -> None:
    """Sync UserPermission records when a user subscribes or upgrades.

    Removes old plan-sourced permissions and creates new ones based on
    the plan_snapshot's type. Preserves addon/admin grants and revocations.
    """
    from app.permissions import get_plan_permissions

    plan_type = plan_snapshot.get("type", "personal")
    target_codes = get_plan_permissions(plan_type)

    # Delete existing plan-sourced user permissions
    old_stmt = select(UserPermission).where(
        UserPermission.user_id == user_id,
        UserPermission.source == "plan",
    )
    old_result = await db.execute(old_stmt)
    old_perms = old_result.scalars().all()
    for op in old_perms:
        await db.delete(op)

    # Resolve permission IDs for the target codes
    perm_stmt = select(Permission).where(Permission.code.in_(target_codes))
    perm_result = await db.execute(perm_stmt)
    perm_map = {p.code: p.id for p in perm_result.scalars().all()}

    # Create new plan-sourced user permissions
    for code in target_codes:
        perm_id = perm_map.get(code)
        if perm_id:
            up = UserPermission(
                user_id=user_id,
                permission_id=perm_id,
                is_granted=True,
                source="plan",
            )
            db.add(up)

    await db.flush()


async def grant_user_permission(
    db: AsyncSession,
    user_id: uuid.UUID,
    permission_code: str,
    source: str = "admin",
) -> None:
    """Grant a specific permission to a user."""
    perm = await _get_permission_by_code(db, permission_code)
    if not perm:
        return

    # Check if already exists
    existing_stmt = select(UserPermission).where(
        UserPermission.user_id == user_id,
        UserPermission.permission_id == perm.id,
    )
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.is_granted = True
        existing.source = source
    else:
        up = UserPermission(
            user_id=user_id,
            permission_id=perm.id,
            is_granted=True,
            source=source,
        )
        db.add(up)

    await db.flush()


async def revoke_user_permission(
    db: AsyncSession,
    user_id: uuid.UUID,
    permission_code: str,
) -> None:
    """Revoke a specific permission from a user."""
    perm = await _get_permission_by_code(db, permission_code)
    if not perm:
        return

    existing_stmt = select(UserPermission).where(
        UserPermission.user_id == user_id,
        UserPermission.permission_id == perm.id,
    )
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.is_granted = False
        existing.source = "revoked"
    else:
        up = UserPermission(
            user_id=user_id,
            permission_id=perm.id,
            is_granted=False,
            source="revoked",
        )
        db.add(up)

    await db.flush()


# ---------------------------------------------------------------------------
# Admin permissions
# ---------------------------------------------------------------------------


async def get_admin_permissions(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> set[str]:
    """Get effective admin permissions for a user.

    Resolution:
    1. Start with all permissions from the admin user's role
    2. Remove any per-admin-user revoked permissions
    """
    permissions: set[str] = set()

    # Find admin user record
    admin_stmt = (
        select(AdminUser)
        .where(AdminUser.user_id == user_id, AdminUser.is_active.is_(True))
    )
    admin_result = await db.execute(admin_stmt)
    admin_user = admin_result.scalar_one_or_none()

    if not admin_user:
        return permissions

    # Role-based permissions
    role_perm_stmt = (
        select(Permission.code)
        .join(
            AdminRolePermission,
            AdminRolePermission.permission_id == Permission.id,
        )
        .where(AdminRolePermission.role_id == admin_user.role_id)
    )
    role_result = await db.execute(role_perm_stmt)
    permissions.update(role_result.scalars().all())

    # Per-user revocations
    revoked_stmt = (
        select(Permission.code)
        .join(
            AdminUserRevokedPermission,
            AdminUserRevokedPermission.permission_id == Permission.id,
        )
        .where(AdminUserRevokedPermission.admin_user_id == admin_user.id)
    )
    revoked_result = await db.execute(revoked_stmt)
    revoked_codes = set(revoked_result.scalars().all())

    permissions -= revoked_codes

    return permissions


async def has_admin_permission(
    db: AsyncSession,
    user_id: uuid.UUID,
    permission_code: str,
) -> bool:
    """Check if an admin user has a specific permission."""
    permissions = await get_admin_permissions(db, user_id)
    return permission_code in permissions


# ---------------------------------------------------------------------------
# Combined check (client + admin)
# ---------------------------------------------------------------------------


async def has_any_permission(
    db: AsyncSession,
    user_id: uuid.UUID,
    permission_code: str,
) -> bool:
    """Check if a user has a permission from either client or admin grants."""
    if is_client_permission(permission_code):
        return await has_permission(db, user_id, permission_code)
    return await has_admin_permission(db, user_id, permission_code)


# ---------------------------------------------------------------------------
# Seed helper
# ---------------------------------------------------------------------------


async def seed_permissions(db: AsyncSession) -> int:
    """Seed the permissions table from the centralized config.

    Returns the number of permissions created.
    """
    from app.permissions import generate_all_permissions

    all_codes = generate_all_permissions()
    created = 0

    for code in all_codes:
        # Check if already exists
        existing_stmt = select(Permission).where(Permission.code == code)
        existing_result = await db.execute(existing_stmt)
        if existing_result.scalar_one_or_none():
            continue

        parts = code.split(":")
        module, feature, action = parts[0], parts[1], parts[2]

        perm = Permission(
            code=code,
            module=module,
            feature=feature,
            action=action,
            label=get_permission_label(code),
            is_client=is_client_permission(code),
        )
        db.add(perm)
        created += 1

    await db.flush()
    return created


async def seed_plan_permissions(
    db: AsyncSession,
    plan_id: uuid.UUID,
    permission_codes: list[str],
) -> int:
    """Assign a list of permissions to a plan.

    Returns the number of plan_permissions created.
    """
    created = 0

    # Resolve permission IDs
    perm_stmt = select(Permission).where(Permission.code.in_(permission_codes))
    perm_result = await db.execute(perm_stmt)
    perm_map = {p.code: p.id for p in perm_result.scalars().all()}

    for code in permission_codes:
        perm_id = perm_map.get(code)
        if not perm_id:
            continue

        # Check if already linked
        existing_stmt = select(PlanPermission).where(
            PlanPermission.plan_id == plan_id,
            PlanPermission.permission_id == perm_id,
        )
        existing_result = await db.execute(existing_stmt)
        if existing_result.scalar_one_or_none():
            continue

        pp = PlanPermission(plan_id=plan_id, permission_id=perm_id)
        db.add(pp)
        created += 1

    await db.flush()
    return created


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_permission_by_code(
    db: AsyncSession,
    code: str,
) -> Permission | None:
    """Fetch a permission by its code string."""
    stmt = select(Permission).where(Permission.code == code)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
