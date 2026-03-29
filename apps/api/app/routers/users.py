"""Users router: profile, preferences, password change."""

from fastapi import APIRouter, Depends, HTTPException, status
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
    currency_default: str
    country: str
    language: str
    plan: str
    salary_day: int | None
    month_start_day: int
    onboarding_completed: bool
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
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class PreferencesUpdateRequest(BaseModel):
    preferences: dict


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(user: User = Depends(get_current_user)) -> UserProfileResponse:
    return UserProfileResponse(
        id=str(user.id),
        name=user.name,
        phone=user.phone,
        email=user.email,
        currency_default=user.currency_default,
        country=user.country,
        language=user.language,
        plan=user.plan,
        salary_day=user.salary_day,
        month_start_day=user.month_start_day,
        onboarding_completed=user.onboarding_completed,
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

    return UserProfileResponse(
        id=str(user.id),
        name=user.name,
        phone=user.phone,
        email=user.email,
        currency_default=user.currency_default,
        country=user.country,
        language=user.language,
        plan=user.plan,
        salary_day=user.salary_day,
        month_start_day=user.month_start_day,
        onboarding_completed=user.onboarding_completed,
        preferences=user.preferences or {},
    )


@router.put("/me/password")
async def change_password(
    data: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not user.password_hash or not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "WRONG_PASSWORD", "message": "Senha actual incorrecta"},
        )
    user.password_hash = hash_password(data.new_password)
    await db.flush()
    return {"message": "Senha alterada com sucesso"}


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
