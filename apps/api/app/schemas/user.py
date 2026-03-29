import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CurrencyCode, SubscriptionPlan


class UserCreate(BaseModel):
    phone: str = Field(max_length=20)
    name: str = Field(max_length=100)
    email: str | None = Field(None, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    currency_default: CurrencyCode = CurrencyCode.AOA
    country: str = Field("AO", max_length=2)
    language: str = Field("pt-AO", max_length=5)


class UserUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=255)
    avatar_url: str | None = None
    currency_default: CurrencyCode | None = None
    country: str | None = Field(None, max_length=2)
    language: str | None = Field(None, max_length=5)
    salary_day: int | None = Field(None, ge=1, le=31)
    month_start_day: int | None = Field(None, ge=1, le=31)
    preferences: dict | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    phone: str | None
    name: str
    avatar_url: str | None
    currency_default: CurrencyCode
    country: str
    language: str
    plan: SubscriptionPlan
    salary_day: int | None
    month_start_day: int
    preferences: dict
    onboarding_completed: bool
    created_at: datetime
