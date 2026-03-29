"""Goal schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import GoalStatus, RecurrenceFrequency


class GoalContributionCreate(BaseModel):
    amount: int = Field(gt=0, description="Contribution in centavos")
    note: str | None = None


class GoalContributionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    user_id: uuid.UUID
    amount: int
    note: str | None
    contributed_at: datetime


class GoalCreate(BaseModel):
    name: str = Field(max_length=100)
    type: str = Field("savings", max_length=50)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    target_amount: int = Field(gt=0, description="Target in centavos")
    target_date: date | None = None
    contribution_amount: int | None = Field(None, gt=0)
    contribution_frequency: RecurrenceFrequency = RecurrenceFrequency.MONTHLY


class GoalUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    target_amount: int | None = Field(None, gt=0)
    target_date: date | None = None
    contribution_amount: int | None = None
    contribution_frequency: RecurrenceFrequency | None = None
    status: GoalStatus | None = None


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: str
    icon: str | None
    color: str | None
    target_amount: int
    current_amount: int
    target_date: date | None
    contribution_amount: int | None
    contribution_frequency: RecurrenceFrequency
    status: GoalStatus
    created_at: datetime


class GoalProgressResponse(BaseModel):
    goal_id: uuid.UUID
    name: str
    target_amount: int
    current_amount: int
    remaining: int
    percentage: float
    contribution_amount: int | None
    months_remaining: int | None
    projected_completion: date | None
    contributions: list[GoalContributionResponse]
