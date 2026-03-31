"""Admin roles router: manage roles, permissions, and admin users (RBAC)."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.permission import (
    AdminRole,
    AdminRolePermission,
    AdminUser,
    AdminUserRevokedPermission,
    Permission,
)
from app.models.user import User
from app.services.permission import has_admin_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/roles", tags=["admin-roles"])


# ---------------------------------------------------------------------------
# Admin permission dependency
# ---------------------------------------------------------------------------


async def require_admin_perm(
    permission_code: str,
    db: AsyncSession,
    user: User,
) -> None:
    """Verificar se o utilizador tem a permissão de administrador requerida."""
    if not await has_admin_permission(db, user.id, permission_code):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissao de administrador.",
        )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permission_codes: list[str] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class RoleResponse(BaseModel):
    id: str
    name: str
    description: str | None
    is_active: bool
    permissions_count: int


class RolePermissionResponse(BaseModel):
    id: str
    code: str
    module: str
    feature: str
    action: str
    label: str


class PermissionCodesPayload(BaseModel):
    permission_codes: list[str]


class AdminUserCreate(BaseModel):
    user_id: str
    role_id: str


class AdminUserResponse(BaseModel):
    id: str
    user_id: str
    role_id: str
    role_name: str
    is_active: bool


class RevokePermissionPayload(BaseModel):
    permission_code: str


# ---------------------------------------------------------------------------
# Role CRUD
# ---------------------------------------------------------------------------


@router.get("", response_model=list[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[RoleResponse]:
    """Listar todos os cargos com contagem de permissoes."""
    await require_admin_perm("admin_roles:manage:read", db, user)

    stmt = select(AdminRole).order_by(AdminRole.name)
    result = await db.execute(stmt)
    roles = result.scalars().all()

    responses: list[RoleResponse] = []
    for role in roles:
        count_stmt = (
            select(func.count())
            .select_from(AdminRolePermission)
            .where(AdminRolePermission.role_id == role.id)
        )
        count_result = await db.execute(count_stmt)
        perm_count = count_result.scalar() or 0

        responses.append(
            RoleResponse(
                id=str(role.id),
                name=role.name,
                description=role.description,
                is_active=role.is_active,
                permissions_count=perm_count,
            )
        )

    return responses


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RoleResponse:
    """Criar um novo cargo com permissoes opcionais."""
    await require_admin_perm("admin_roles:manage:create", db, user)

    # Check for duplicate name
    existing_stmt = select(AdminRole).where(AdminRole.name == data.name)
    existing_result = await db.execute(existing_stmt)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ja existe um cargo com este nome.",
        )

    role = AdminRole(
        name=data.name,
        description=data.description,
        is_active=True,
    )
    db.add(role)
    await db.flush()
    await db.refresh(role)

    # Assign permissions if provided
    perm_count = 0
    if data.permission_codes:
        perm_stmt = select(Permission).where(
            Permission.code.in_(data.permission_codes)
        )
        perm_result = await db.execute(perm_stmt)
        perms = perm_result.scalars().all()

        for perm in perms:
            rp = AdminRolePermission(role_id=role.id, permission_id=perm.id)
            db.add(rp)
            perm_count += 1

        await db.flush()

    logger.info(
        "Cargo criado: id=%s, name=%s, perms=%d (por admin=%s)",
        role.id, role.name, perm_count, user.id,
    )

    return RoleResponse(
        id=str(role.id),
        name=role.name,
        description=role.description,
        is_active=role.is_active,
        permissions_count=perm_count,
    )


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: uuid.UUID,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RoleResponse:
    """Actualizar um cargo existente."""
    await require_admin_perm("admin_roles:manage:update", db, user)

    result = await db.execute(select(AdminRole).where(AdminRole.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cargo nao encontrado.",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)

    await db.flush()
    await db.refresh(role)

    count_stmt = (
        select(func.count())
        .select_from(AdminRolePermission)
        .where(AdminRolePermission.role_id == role.id)
    )
    count_result = await db.execute(count_stmt)
    perm_count = count_result.scalar() or 0

    logger.info("Cargo actualizado: id=%s (por admin=%s)", role.id, user.id)

    return RoleResponse(
        id=str(role.id),
        name=role.name,
        description=role.description,
        is_active=role.is_active,
        permissions_count=perm_count,
    )


@router.delete("/{role_id}")
async def deactivate_role(
    role_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Desactivar um cargo (nao elimina, marca como inactivo)."""
    await require_admin_perm("admin_roles:manage:delete", db, user)

    result = await db.execute(select(AdminRole).where(AdminRole.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cargo nao encontrado.",
        )

    role.is_active = False
    await db.flush()

    logger.info("Cargo desactivado: id=%s (por admin=%s)", role.id, user.id)
    return {"message": "Cargo desactivado com sucesso."}


# ---------------------------------------------------------------------------
# Role permissions
# ---------------------------------------------------------------------------


@router.get("/{role_id}/permissions", response_model=list[RolePermissionResponse])
async def list_role_permissions(
    role_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[RolePermissionResponse]:
    """Listar permissoes atribuidas a um cargo."""
    await require_admin_perm("admin_roles:manage:read", db, user)

    # Check role exists
    role_result = await db.execute(select(AdminRole).where(AdminRole.id == role_id))
    if not role_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cargo nao encontrado.",
        )

    stmt = (
        select(Permission)
        .join(AdminRolePermission, AdminRolePermission.permission_id == Permission.id)
        .where(AdminRolePermission.role_id == role_id)
        .order_by(Permission.module, Permission.feature, Permission.action)
    )
    result = await db.execute(stmt)
    perms = result.scalars().all()

    return [
        RolePermissionResponse(
            id=str(p.id),
            code=p.code,
            module=p.module,
            feature=p.feature,
            action=p.action,
            label=p.label,
        )
        for p in perms
    ]


@router.post("/{role_id}/permissions", status_code=status.HTTP_201_CREATED)
async def add_role_permissions(
    role_id: uuid.UUID,
    data: PermissionCodesPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Adicionar permissoes a um cargo."""
    await require_admin_perm("admin_roles:manage:update", db, user)

    # Check role exists
    role_result = await db.execute(select(AdminRole).where(AdminRole.id == role_id))
    if not role_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cargo nao encontrado.",
        )

    # Resolve permissions
    perm_stmt = select(Permission).where(Permission.code.in_(data.permission_codes))
    perm_result = await db.execute(perm_stmt)
    perms = perm_result.scalars().all()

    added = 0
    for perm in perms:
        # Check if already assigned
        existing_stmt = select(AdminRolePermission).where(
            AdminRolePermission.role_id == role_id,
            AdminRolePermission.permission_id == perm.id,
        )
        existing_result = await db.execute(existing_stmt)
        if existing_result.scalar_one_or_none():
            continue

        rp = AdminRolePermission(role_id=role_id, permission_id=perm.id)
        db.add(rp)
        added += 1

    await db.flush()

    logger.info(
        "Permissoes adicionadas ao cargo %s: %d (por admin=%s)",
        role_id, added, user.id,
    )
    return {"message": f"{added} permissao(oes) adicionada(s) com sucesso."}


@router.delete("/{role_id}/permissions/{permission_id}")
async def remove_role_permission(
    role_id: uuid.UUID,
    permission_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remover uma permissao de um cargo."""
    await require_admin_perm("admin_roles:manage:update", db, user)

    stmt = select(AdminRolePermission).where(
        AdminRolePermission.role_id == role_id,
        AdminRolePermission.permission_id == permission_id,
    )
    result = await db.execute(stmt)
    rp = result.scalar_one_or_none()

    if not rp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permissao nao encontrada neste cargo.",
        )

    await db.delete(rp)
    await db.flush()

    logger.info(
        "Permissao %s removida do cargo %s (por admin=%s)",
        permission_id, role_id, user.id,
    )
    return {"message": "Permissao removida com sucesso."}


# ---------------------------------------------------------------------------
# Admin users
# ---------------------------------------------------------------------------


@router.get("/admin-users", response_model=list[AdminUserResponse])
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AdminUserResponse]:
    """Listar utilizadores administradores com os seus cargos."""
    await require_admin_perm("admin_roles:users:read", db, user)

    stmt = (
        select(AdminUser)
        .options(selectinload(AdminUser.role))
        .order_by(AdminUser.created_at.desc())
    )
    result = await db.execute(stmt)
    admin_users = result.scalars().all()

    return [
        AdminUserResponse(
            id=str(au.id),
            user_id=str(au.user_id),
            role_id=str(au.role_id),
            role_name=au.role.name if au.role else "",
            is_active=au.is_active,
        )
        for au in admin_users
    ]


@router.post("/admin-users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def assign_admin_user(
    data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AdminUserResponse:
    """Atribuir um cargo de administrador a um utilizador."""
    await require_admin_perm("admin_roles:users:create", db, user)

    user_uuid = uuid.UUID(data.user_id)
    role_uuid = uuid.UUID(data.role_id)

    # Check role exists
    role_result = await db.execute(select(AdminRole).where(AdminRole.id == role_uuid))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cargo nao encontrado.",
        )

    # Check if user already has an admin record
    existing_stmt = select(AdminUser).where(AdminUser.user_id == user_uuid)
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        # Reactivate and update role
        existing.role_id = role_uuid
        existing.is_active = True
        await db.flush()
        await db.refresh(existing, ["role"])

        logger.info(
            "Admin user reactivado: user_id=%s, role=%s (por admin=%s)",
            data.user_id, role.name, user.id,
        )
        return AdminUserResponse(
            id=str(existing.id),
            user_id=str(existing.user_id),
            role_id=str(existing.role_id),
            role_name=role.name,
            is_active=existing.is_active,
        )

    admin_user = AdminUser(
        user_id=user_uuid,
        role_id=role_uuid,
        is_active=True,
    )
    db.add(admin_user)
    await db.flush()
    await db.refresh(admin_user)

    logger.info(
        "Admin user criado: user_id=%s, role=%s (por admin=%s)",
        data.user_id, role.name, user.id,
    )
    return AdminUserResponse(
        id=str(admin_user.id),
        user_id=str(admin_user.user_id),
        role_id=str(admin_user.role_id),
        role_name=role.name,
        is_active=admin_user.is_active,
    )


@router.delete("/admin-users/{admin_user_id}")
async def remove_admin_user(
    admin_user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Desactivar um utilizador administrador."""
    await require_admin_perm("admin_roles:users:delete", db, user)

    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_user_id))
    admin_user = result.scalar_one_or_none()
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizador administrador nao encontrado.",
        )

    admin_user.is_active = False
    await db.flush()

    logger.info(
        "Admin user desactivado: id=%s (por admin=%s)",
        admin_user_id, user.id,
    )
    return {"message": "Utilizador administrador desactivado com sucesso."}


# ---------------------------------------------------------------------------
# Admin user permission revocations
# ---------------------------------------------------------------------------


@router.post("/admin-users/{admin_user_id}/revoke-permission")
async def revoke_admin_user_permission(
    admin_user_id: uuid.UUID,
    data: RevokePermissionPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Revogar uma permissao especifica de um utilizador administrador."""
    await require_admin_perm("admin_roles:users:update", db, user)

    # Check admin user exists
    au_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_user_id))
    admin_user = au_result.scalar_one_or_none()
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizador administrador nao encontrado.",
        )

    # Find permission
    perm_stmt = select(Permission).where(Permission.code == data.permission_code)
    perm_result = await db.execute(perm_stmt)
    perm = perm_result.scalar_one_or_none()
    if not perm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permissao nao encontrada.",
        )

    # Check if already revoked
    existing_stmt = select(AdminUserRevokedPermission).where(
        AdminUserRevokedPermission.admin_user_id == admin_user_id,
        AdminUserRevokedPermission.permission_id == perm.id,
    )
    existing_result = await db.execute(existing_stmt)
    if existing_result.scalar_one_or_none():
        return {"message": "Permissao ja se encontra revogada."}

    revocation = AdminUserRevokedPermission(
        admin_user_id=admin_user_id,
        permission_id=perm.id,
    )
    db.add(revocation)
    await db.flush()

    logger.info(
        "Permissao %s revogada do admin user %s (por admin=%s)",
        data.permission_code, admin_user_id, user.id,
    )
    return {"message": "Permissao revogada com sucesso."}


@router.delete("/admin-users/{admin_user_id}/revoke-permission/{permission_code}")
async def unrevoke_admin_user_permission(
    admin_user_id: uuid.UUID,
    permission_code: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remover a revogacao de uma permissao de um utilizador administrador."""
    await require_admin_perm("admin_roles:users:update", db, user)

    # Find permission
    perm_stmt = select(Permission).where(Permission.code == permission_code)
    perm_result = await db.execute(perm_stmt)
    perm = perm_result.scalar_one_or_none()
    if not perm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permissao nao encontrada.",
        )

    # Find revocation record
    stmt = select(AdminUserRevokedPermission).where(
        AdminUserRevokedPermission.admin_user_id == admin_user_id,
        AdminUserRevokedPermission.permission_id == perm.id,
    )
    result = await db.execute(stmt)
    revocation = result.scalar_one_or_none()

    if not revocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Revogacao nao encontrada.",
        )

    await db.delete(revocation)
    await db.flush()

    logger.info(
        "Revogacao de permissao %s removida do admin user %s (por admin=%s)",
        permission_code, admin_user_id, user.id,
    )
    return {"message": "Revogacao removida com sucesso."}
