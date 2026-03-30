"""Family schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CurrencyCode, FamilyRelation, FamilyRole


class FamilyCreate(BaseModel):
    name: str = Field("A Minha Família", max_length=100)
    currency: CurrencyCode = CurrencyCode.AOA
    month_start_day: int = Field(1, ge=1, le=28)


class FamilyUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    currency: CurrencyCode | None = None
    month_start_day: int | None = Field(None, ge=1, le=28)
    contribution_model: dict | None = None


class FamilyMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    user_id: uuid.UUID
    role: FamilyRole
    display_name: str | None
    is_active: bool
    joined_at: datetime
    family_relation: FamilyRelation | None = None
    can_add_transactions: bool = True
    can_edit_budgets: bool = False
    can_view_all_accounts: bool = False
    can_invite_members: bool = False


class FamilyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    admin_user_id: uuid.UUID
    currency: CurrencyCode
    month_start_day: int
    contribution_model: dict
    invite_code: str | None
    members: list[FamilyMemberResponse]
    created_at: datetime


class InviteCreate(BaseModel):
    phone: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=255)
    role: FamilyRole = FamilyRole.ADULT


class InviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    invite_phone: str | None
    invite_email: str | None
    role: FamilyRole
    status: str
    expires_at: datetime | None


class AcceptInviteRequest(BaseModel):
    invite_code: str


class MemberRoleUpdate(BaseModel):
    role: FamilyRole


# --- New schemas for join request flow ---


class JoinRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    user_id: uuid.UUID | None
    invite_phone: str | None
    status: str
    created_at: datetime
    user_name: str | None = None


class RegenerateCodeResponse(BaseModel):
    invite_code: str


class JoinFamilyResponse(BaseModel):
    message: str


class CreateDirectMemberRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=9, max_length=20)
    password: str = Field(..., min_length=6)
    role: FamilyRole = FamilyRole.ADULT
    family_relation: FamilyRelation | None = None
    display_name: str | None = Field(None, max_length=100)


class MemberUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=100)
    family_relation: FamilyRelation | None = None
    can_add_transactions: bool | None = None
    can_edit_budgets: bool | None = None
    can_view_all_accounts: bool | None = None
    can_invite_members: bool | None = None


class SuccessResponse(BaseModel):
    success: bool = True
