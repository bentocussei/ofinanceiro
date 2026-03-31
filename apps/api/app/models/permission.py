"""Permission models for the RBAC system.

Covers:
- Permission: individual permission codes (module:feature:action)
- PlanPermission: permissions granted by a plan
- UserPermission: per-user permission overrides (grants/revokes)
- AdminRole / AdminRolePermission / AdminUser / AdminUserRevokedPermission: admin RBAC
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Permission(BaseModel):
    """A single permission identified by module:feature:action."""

    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint("module", "feature", "action", name="uq_permission_mfa"),
    )

    code: Mapped[str] = mapped_column(
        String(100), unique=True, index=True
    )  # e.g. "transactions:manage:create"
    module: Mapped[str] = mapped_column(String(50), index=True)  # e.g. "transactions"
    feature: Mapped[str] = mapped_column(String(50))  # e.g. "manage"
    action: Mapped[str] = mapped_column(String(20))  # e.g. "create"
    label: Mapped[str] = mapped_column(String(200))  # e.g. "Transacções > Gestão de transacções > Criar"
    is_client: Mapped[bool] = mapped_column(Boolean, default=True)  # client vs admin

    # Reverse relationships
    plan_permissions: Mapped[list["PlanPermission"]] = relationship(
        back_populates="permission", lazy="noload"
    )
    user_permissions: Mapped[list["UserPermission"]] = relationship(
        back_populates="permission", lazy="noload"
    )


class PlanPermission(BaseModel):
    """Links a plan to the permissions it grants."""

    __tablename__ = "plan_permissions"
    __table_args__ = (
        UniqueConstraint("plan_id", "permission_id", name="uq_plan_permission"),
    )

    plan_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="CASCADE"),
        index=True,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        index=True,
    )

    # Relationships
    permission: Mapped["Permission"] = relationship(
        back_populates="plan_permissions", lazy="joined"
    )


class UserPermission(BaseModel):
    """Per-user permission override (grant or revoke)."""

    __tablename__ = "user_permissions"
    __table_args__ = (
        UniqueConstraint("user_id", "permission_id", name="uq_user_permission"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        index=True,
    )
    is_granted: Mapped[bool] = mapped_column(
        Boolean, default=True
    )  # True = granted, False = explicitly revoked
    source: Mapped[str] = mapped_column(
        String(20)
    )  # "plan", "addon", "admin", "revoked"

    # Relationships
    permission: Mapped["Permission"] = relationship(
        back_populates="user_permissions", lazy="joined"
    )


# ---------------------------------------------------------------------------
# Admin RBAC
# ---------------------------------------------------------------------------


class AdminRole(BaseModel):
    """Named admin role (e.g. super_admin, support, billing_admin)."""

    __tablename__ = "admin_roles"

    name: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )  # e.g. "super_admin"
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    role_permissions: Mapped[list["AdminRolePermission"]] = relationship(
        back_populates="role", lazy="noload"
    )
    admin_users: Mapped[list["AdminUser"]] = relationship(
        back_populates="role", lazy="noload"
    )


class AdminRolePermission(BaseModel):
    """Links an admin role to its permissions."""

    __tablename__ = "admin_role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_admin_role_permission"),
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("admin_roles.id", ondelete="CASCADE"),
        index=True,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        index=True,
    )

    # Relationships
    role: Mapped["AdminRole"] = relationship(
        back_populates="role_permissions", lazy="joined"
    )
    permission: Mapped["Permission"] = relationship(lazy="joined")


class AdminUser(BaseModel):
    """Links a regular user to an admin role."""

    __tablename__ = "admin_users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("admin_roles.id", ondelete="CASCADE"),
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    role: Mapped["AdminRole"] = relationship(
        back_populates="admin_users", lazy="joined"
    )
    revoked_permissions: Mapped[list["AdminUserRevokedPermission"]] = relationship(
        back_populates="admin_user", lazy="noload"
    )


class AdminUserRevokedPermission(BaseModel):
    """Per-admin-user permission revocation (override from role)."""

    __tablename__ = "admin_user_revoked_permissions"
    __table_args__ = (
        UniqueConstraint(
            "admin_user_id",
            "permission_id",
            name="uq_admin_user_revoked_permission",
        ),
    )

    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="CASCADE"),
        index=True,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        index=True,
    )

    # Relationships
    admin_user: Mapped["AdminUser"] = relationship(
        back_populates="revoked_permissions", lazy="joined"
    )
    permission: Mapped["Permission"] = relationship(lazy="joined")
