"""Tags router: CRUD para etiquetas do utilizador."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.tag import Tag
from app.models.user import User

router = APIRouter(prefix="/api/v1/tags", tags=["tags"])


class TagCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=50)
    color: str | None = Field(None, max_length=7)


@router.get("/")
async def list_tags(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(Tag).where(Tag.user_id == user.id).order_by(Tag.name.asc())
    result = await db.execute(stmt)
    tags = result.scalars().all()
    return [_to_dict(t) for t in tags]


@router.post("/", status_code=201)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    # Verificar duplicado
    existing = await db.execute(
        select(Tag).where(Tag.user_id == user.id, Tag.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "DUPLICATE", "message": "Etiqueta com este nome já existe"},
        )
    tag = Tag(user_id=user.id, **data.model_dump())
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return _to_dict(tag)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    stmt = select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id)
    result = await db.execute(stmt)
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Etiqueta não encontrada"},
        )
    await db.delete(tag)


def _to_dict(tag: Tag) -> dict:
    return {
        "id": tag.id,
        "user_id": tag.user_id,
        "name": tag.name,
        "color": tag.color,
        "created_at": tag.created_at,
        "updated_at": tag.updated_at,
    }
