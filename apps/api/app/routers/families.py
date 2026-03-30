"""Families router: CRUD, invites, members, join requests, spending."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.family import FamilyMember
from app.models.user import User
from app.schemas.family import (
    AcceptInviteRequest,
    CreateDirectMemberRequest,
    FamilyCreate,
    FamilyMemberResponse,
    FamilyResponse,
    FamilyUpdate,
    InviteCreate,
    InviteResponse,
    JoinFamilyResponse,
    JoinRequestResponse,
    MemberRoleUpdate,
    MemberUpdate,
    RegenerateCodeResponse,
    SuccessResponse,
)
from app.services import family as family_service

router = APIRouter(prefix="/api/v1/families", tags=["families"])


# ─── Family CRUD ────────────────────────────────────────────────────────


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
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode editar a família"},
        )
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


# ─── Regenerate invite code ─────────────────────────────────────────────


@router.post("/{family_id}/regenerate-code", response_model=RegenerateCodeResponse)
async def regenerate_code(
    family_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RegenerateCodeResponse:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode regenerar o código"},
        )
    family = await family_service.get_family(db, family_id)
    if not family:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    new_code = await family_service.regenerate_invite_code(db, family)
    return RegenerateCodeResponse(invite_code=new_code)


# ─── Join flow (request-based) ──────────────────────────────────────────


@router.post("/join", response_model=JoinFamilyResponse, status_code=201)
async def join_family(
    data: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JoinFamilyResponse:
    # Check user doesn't already have a family
    existing = await family_service.get_user_family(db, user.id)
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_IN_FAMILY", "message": "Já pertence a uma família"},
        )

    invite = await family_service.create_join_request(db, data.invite_code, user)
    if not invite:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CODE", "message": "Código de convite inválido, já é membro, ou já tem um pedido pendente"},
        )
    return JoinFamilyResponse(message="Pedido de integração enviado")


@router.get("/{family_id}/join-requests", response_model=list[JoinRequestResponse])
async def get_join_requests(
    family_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[JoinRequestResponse]:
    # Admin or member with can_invite_members
    is_admin = await family_service.is_family_admin(db, family_id, user.id)
    if not is_admin:
        member = await family_service.get_user_member(db, family_id, user.id)
        if not member or not member.can_invite_members:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail={"code": "NO_PERMISSION", "message": "Sem permissão para ver pedidos de integração"},
            )
    requests = await family_service.get_join_requests(db, family_id)
    return [JoinRequestResponse(**r) for r in requests]


@router.put("/{family_id}/join-requests/{invite_id}/approve", response_model=FamilyMemberResponse)
async def approve_join_request(
    family_id: uuid.UUID,
    invite_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyMemberResponse:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode aprovar pedidos"},
        )
    member = await family_service.approve_join_request(db, family_id, invite_id)
    if not member:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "REQUEST_NOT_FOUND", "message": "Pedido de integração não encontrado ou já processado"},
        )
    return FamilyMemberResponse.model_validate(member)


@router.put("/{family_id}/join-requests/{invite_id}/reject", response_model=SuccessResponse)
async def reject_join_request(
    family_id: uuid.UUID,
    invite_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SuccessResponse:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode recusar pedidos"},
        )
    success = await family_service.reject_join_request(db, family_id, invite_id)
    if not success:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "REQUEST_NOT_FOUND", "message": "Pedido de integração não encontrado ou já processado"},
        )
    return SuccessResponse(success=True)


# ─── Leave family ────────────────────────────────────────────────────────


@router.post("/leave", response_model=SuccessResponse)
async def leave_family(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SuccessResponse:
    family = await family_service.get_user_family(db, user.id)
    if not family:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_IN_FAMILY", "message": "Não pertence a nenhuma família"},
        )
    success = await family_service.leave_family(db, family.id, user.id)
    if not success:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "code": "SOLE_ADMIN",
                "message": "Não pode sair sendo o único admin. Transfira o cargo de admin primeiro ou elimine a família.",
            },
        )
    return SuccessResponse(success=True)


# ─── Direct member creation ─────────────────────────────────────────────


@router.post("/{family_id}/members/create-direct", response_model=FamilyMemberResponse, status_code=201)
async def create_direct_member(
    family_id: uuid.UUID,
    data: CreateDirectMemberRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyMemberResponse:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode criar membros directamente"},
        )
    family = await family_service.get_family(db, family_id)
    if not family:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    try:
        member = await family_service.create_direct_member(
            db,
            family_id=family_id,
            name=data.name,
            phone=data.phone,
            password=data.password,
            role=data.role,
            family_relation=data.family_relation,
            display_name=data.display_name,
        )
    except ValueError as e:
        if str(e) == "PHONE_EXISTS":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={"code": "PHONE_EXISTS", "message": "Já existe um utilizador com este número de telefone"},
            )
        raise
    return FamilyMemberResponse.model_validate(member)


# ─── Invites (legacy) ───────────────────────────────────────────────────


@router.post("/{family_id}/invite", response_model=InviteResponse, status_code=201)
async def invite_member(
    family_id: uuid.UUID,
    data: InviteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InviteResponse:
    if not await family_service.is_family_admin(db, family_id, user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode convidar"},
        )
    invite = await family_service.create_invite(db, family_id, user.id, data.phone, data.email, data.role)
    return InviteResponse.model_validate(invite)


# ─── Member management ──────────────────────────────────────────────────


@router.put("/members/{member_id}", response_model=FamilyMemberResponse)
async def update_member(
    member_id: uuid.UUID,
    data: MemberUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyMemberResponse:
    result = await db.execute(select(FamilyMember).where(FamilyMember.id == member_id))
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    if not await family_service.is_family_admin(db, target_member.family_id, user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_ADMIN", "message": "Apenas o admin pode editar permissões de membros"},
        )

    updated = await family_service.update_member(db, member_id, data)
    if not updated:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return FamilyMemberResponse.model_validate(updated)


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: uuid.UUID,
    data: MemberRoleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FamilyMemberResponse:
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
    result = await db.execute(select(FamilyMember).where(FamilyMember.id == member_id))
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    if not await family_service.is_family_admin(db, target_member.family_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    await family_service.remove_member(db, member_id)


# ─── Spending ────────────────────────────────────────────────────────────


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
