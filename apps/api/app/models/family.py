"""Family, FamilyMember, and FamilyInvite models."""

import secrets
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import CurrencyCode, FamilyRelation, FamilyRole


def generate_invite_code() -> str:
    return secrets.token_urlsafe(12)


class Family(BaseModel):
    __tablename__ = "families"

    name: Mapped[str] = mapped_column(String(100), default="A Minha Família")
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    month_start_day: Mapped[int] = mapped_column(SmallInteger, default=1)
    contribution_model: Mapped[dict] = mapped_column(JSONB, default=lambda: {"type": "equal"})
    invite_code: Mapped[str | None] = mapped_column(String(20), unique=True, default=generate_invite_code)

    members: Mapped[list["FamilyMember"]] = relationship(
        back_populates="family", lazy="subquery", cascade="all, delete-orphan"
    )
    invites: Mapped[list["FamilyInvite"]] = relationship(
        back_populates="family", lazy="noload", cascade="all, delete-orphan"
    )


class FamilyMember(BaseModel):
    __tablename__ = "family_members"

    family_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[FamilyRole] = mapped_column(
        ENUM(FamilyRole, name="family_role", create_type=True),
        default=FamilyRole.ADULT,
    )
    display_name: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    family_relation: Mapped[FamilyRelation | None] = mapped_column(
        ENUM(FamilyRelation, name="family_relation", create_type=True), nullable=True
    )
    can_add_transactions: Mapped[bool] = mapped_column(Boolean, default=True)
    can_edit_budgets: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_all_accounts: Mapped[bool] = mapped_column(Boolean, default=False)
    can_invite_members: Mapped[bool] = mapped_column(Boolean, default=False)

    family: Mapped["Family"] = relationship(back_populates="members")

    __table_args__ = (
        UniqueConstraint("family_id", "user_id", name="uq_family_member"),
    )


class FamilyInvite(BaseModel):
    __tablename__ = "family_invites"

    family_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    invite_phone: Mapped[str | None] = mapped_column(String(20))
    invite_email: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[FamilyRole] = mapped_column(
        ENUM(FamilyRole, name="family_role", create_type=True),
        default=FamilyRole.ADULT,
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    family: Mapped["Family"] = relationship(back_populates="invites")
