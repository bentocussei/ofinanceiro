import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CategoryType


class CategoryCreate(BaseModel):
    name: str = Field(max_length=100)
    parent_id: uuid.UUID | None = None
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    type: CategoryType = CategoryType.EXPENSE


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    is_active: bool | None = None
    sort_order: int | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    parent_id: uuid.UUID | None
    name: str
    icon: str | None
    color: str | None
    type: CategoryType
    is_system: bool
    is_active: bool
    sort_order: int
    created_at: datetime
