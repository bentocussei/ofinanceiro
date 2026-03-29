"""Budget schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import BudgetMethod, BudgetPeriod


class BudgetItemCreate(BaseModel):
    category_id: uuid.UUID
    limit_amount: int = Field(gt=0, description="Limit in centavos")


class BudgetItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    budget_id: uuid.UUID
    category_id: uuid.UUID
    limit_amount: int
    rollover_amount: int


class BudgetItemStatus(BaseModel):
    category_id: uuid.UUID
    category_name: str
    category_icon: str | None
    limit_amount: int
    spent: int
    remaining: int
    percentage: float


class BudgetCreate(BaseModel):
    name: str | None = Field(None, max_length=100)
    method: BudgetMethod = BudgetMethod.CATEGORY
    period_type: BudgetPeriod = BudgetPeriod.MONTHLY
    period_start: date
    period_end: date
    total_limit: int | None = Field(None, gt=0, description="Total limit in centavos (for flex methods)")
    rollover: bool = False
    items: list[BudgetItemCreate] = Field(default_factory=list)


class BudgetUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    is_active: bool | None = None
    rollover: bool | None = None
    total_limit: int | None = None


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str | None
    method: BudgetMethod
    period_type: BudgetPeriod
    period_start: date
    period_end: date
    total_limit: int | None
    rollover: bool
    is_active: bool
    items: list[BudgetItemResponse]
    created_at: datetime


class BudgetStatusResponse(BaseModel):
    budget_id: uuid.UUID
    name: str | None
    method: BudgetMethod
    period_start: date
    period_end: date
    days_remaining: int
    total_limit: int | None
    total_spent: int
    total_remaining: int
    percentage: float
    items: list[BudgetItemStatus]
