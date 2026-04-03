"""Users router: profile, preferences, password change, avatar upload."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.auth import hash_password, verify_password

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UserProfileResponse(BaseModel):
    id: str
    name: str
    phone: str | None
    email: str | None
    avatar_url: str | None
    currency_default: str
    country: str
    language: str
    plan: str
    salary_day: int | None
    month_start_day: int
    onboarding_completed: bool
    has_password: bool
    preferences: dict


class UserUpdateRequest(BaseModel):
    name: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=255)
    currency_default: str | None = None
    country: str | None = Field(None, max_length=2)
    language: str | None = Field(None, max_length=5)
    salary_day: int | None = Field(None, ge=1, le=31)
    month_start_day: int | None = Field(None, ge=1, le=31)


class PasswordChangeRequest(BaseModel):
    current_password: str | None = None  # Null quando utilizador define senha pela primeira vez
    new_password: str = Field(min_length=6, max_length=128)


class PreferencesUpdateRequest(BaseModel):
    preferences: dict


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileResponse:
    # Resolve avatar file_id to presigned URL
    avatar_url: str | None = None
    if user.avatar_url:
        try:
            import uuid as _uuid
            from app.services import storage as storage_service
            file_id = _uuid.UUID(user.avatar_url)
            avatar_url = await storage_service.get_download_url(db, file_id, user.id, expires_in=3600)
        except (ValueError, Exception):
            pass

    return UserProfileResponse(
        id=str(user.id),
        name=user.name,
        phone=user.phone,
        email=user.email,
        avatar_url=avatar_url,
        currency_default=user.currency_default,
        country=user.country,
        language=user.language,
        plan=user.plan,
        salary_day=user.salary_day,
        month_start_day=user.month_start_day,
        onboarding_completed=user.onboarding_completed,
        has_password=user.password_hash is not None,
        preferences=user.preferences or {},
    )


@router.put("/me", response_model=UserProfileResponse)
async def update_profile(
    data: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileResponse:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()

    # Resolve avatar
    avatar_url: str | None = None
    if user.avatar_url:
        try:
            import uuid as _uuid
            from app.services import storage as storage_service
            file_id = _uuid.UUID(user.avatar_url)
            avatar_url = await storage_service.get_download_url(db, file_id, user.id, expires_in=3600)
        except (ValueError, Exception):
            pass

    return UserProfileResponse(
        id=str(user.id),
        name=user.name,
        phone=user.phone,
        email=user.email,
        avatar_url=avatar_url,
        currency_default=user.currency_default,
        country=user.country,
        language=user.language,
        plan=user.plan,
        salary_day=user.salary_day,
        month_start_day=user.month_start_day,
        onboarding_completed=user.onboarding_completed,
        has_password=user.password_hash is not None,
        preferences=user.preferences or {},
    )


@router.put("/me/password")
async def change_password(
    data: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    # Se utilizador já tem password: verificar a actual
    if user.password_hash:
        if not data.current_password or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "WRONG_PASSWORD", "message": "Senha actual incorrecta"},
            )
    # Se não tem password: permite definir sem verificação (primeiro setup)
    user.password_hash = hash_password(data.new_password)
    await db.flush()
    return {"message": "Senha definida com sucesso" if not user.password_hash else "Senha alterada com sucesso"}


@router.put("/me/preferences")
async def update_preferences(
    data: PreferencesUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    prefs = dict(user.preferences or {})
    prefs.update(data.preferences)
    user.preferences = prefs
    await db.flush()
    return {"preferences": user.preferences}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Upload avatar photo. Replaces previous avatar automatically."""
    from app.services import storage as storage_service

    file_record = await storage_service.upload_file(
        db, user.id, file, category="avatar",
    )

    # Store file_id as avatar reference (not presigned URL)
    user.avatar_url = str(file_record.id)
    await db.commit()

    # Return a fresh download URL for immediate display
    url = await storage_service.get_download_url(db, file_record.id, user.id, expires_in=3600)
    return {
        "avatar_url": url,
        "file_id": str(file_record.id),
    }


@router.get("/me/avatar")
async def get_avatar_url(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get a fresh presigned URL for the user's avatar (valid 1 hour)."""
    if not user.avatar_url:
        raise HTTPException(status_code=404, detail="Sem foto de perfil")

    from app.services import storage as storage_service
    import uuid as _uuid

    try:
        file_id = _uuid.UUID(user.avatar_url)
    except ValueError:
        raise HTTPException(status_code=404, detail="Referencia de avatar invalida")

    url = await storage_service.get_download_url(db, file_id, user.id, expires_in=3600)
    return {"avatar_url": url}


@router.delete("/me/avatar")
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remove avatar photo."""
    from app.services import storage as storage_service
    from sqlalchemy import select
    from app.models.file import File as FileModel

    # Find and delete current avatar
    result = await db.scalars(
        select(FileModel).where(
            FileModel.user_id == user.id,
            FileModel.category == "avatar",
            FileModel.is_deleted.is_(False),
        )
    )
    for f in result.all():
        await storage_service.delete_file(db, f.id, user.id)

    user.avatar_url = None
    await db.commit()
    return {"message": "Avatar removido"}
