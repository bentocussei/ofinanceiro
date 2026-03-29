"""Family schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CurrencyCode, FamilyRole


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
    expires_at: datetime


class AcceptInviteRequest(BaseModel):
    invite_code: str


class MemberRoleUpdate(BaseModel):
    role: FamilyRole
