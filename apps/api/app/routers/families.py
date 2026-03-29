"""Families router: CRUD, invites, members, spending."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.family import (
    AcceptInviteRequest,
    FamilyCreate,
    FamilyMemberResponse,
    FamilyResponse,
    FamilyUpdate,
    InviteCreate,
    InviteResponse,
    MemberRoleUpdate,
)
from app.services import family as family_service

router = APIRouter(prefix="/api/v1/families", tags=["families"])


@router.get("/me", response_model=FamilyResponse | None)
async def get_my_family(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyResponse | None:
    family = await family_service.get_user_family(db, user.id)
    if not family:
        return None
    return FamilyResponse.model_validate(family)


@router.post("/", response_model=FamilyResponse, status_code=201)
async def create_family(
    data: FamilyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyResponse:
    # Check user doesn't already have a family
    existing = await family_service.get_user_family(db, user.id)
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_IN_FAMILY", "message": "Já pertence a uma família"},
        )
    family = await family_service.create_family(db, user.id, data)
    return FamilyResponse.model_validate(family)


@router.put("/{family_id}", response_model=FamilyResponse)
async def update_family(
    family_id: uuid.UUID,
    data: FamilyUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyResponse:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode editar a família"})
    family = await family_service.get_family(db, family_id)
    if not family:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    updated = await family_service.update_family(db, family, data)
    return FamilyResponse.model_validate(updated)


@router.delete("/{family_id}", status_code=204)
async def delete_family(
    family_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    family = await family_service.get_family(db, family_id)
    if not family:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await family_service.delete_family(db, family)


@router.post("/{family_id}/invite", response_model=InviteResponse, status_code=201)
async def invite_member(
    family_id: uuid.UUID,
    data: InviteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InviteResponse:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode convidar"})
    invite = await family_service.create_invite(db, family_id, user.id, data.phone, data.email, data.role)
    return InviteResponse.model_validate(invite)


@router.post("/join", response_model=FamilyMemberResponse, status_code=201)
async def join_family(
    data: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyMemberResponse:
    member = await family_service.accept_invite_by_code(db, data.invite_code, user.id)
    if not member:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CODE", "message": "Código de convite inválido ou já é membro"},
        )
    return FamilyMemberResponse.model_validate(member)


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: uuid.UUID,
    data: MemberRoleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyMemberResponse:
    # Verify admin permission (check via member's family)
    from sqlalchemy import select

    from app.models.family import FamilyMember

    result = await db.execute(select(FamilyMember).where(FamilyMember.id == member_id))
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    if not await family_service.is_family_admin(db, target_member.family_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    updated = await family_service.update_member_role(db, member_id, data.role)
    return FamilyMemberResponse.model_validate(updated)


@router.delete("/members/{member_id}", status_code=204)
async def remove_member(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    from sqlalchemy import select

    from app.models.family import FamilyMember

    result = await db.execute(select(FamilyMember).where(FamilyMember.id == member_id))
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    if not await family_service.is_family_admin(db, target_member.family_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    await family_service.remove_member(db, member_id)


@router.get("/{family_id}/spending")
async def get_family_spending(
    family_id: uuid.UUID,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    if not await family_service.is_family_member(db, family_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    return await family_service.get_family_spending(db, family_id, days)
