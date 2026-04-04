"""Investment schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class InvestmentCreate(BaseModel):
    name: str = Field(max_length=100)
    type: str = Field(max_length=50, description="deposit, bond, stock, crypto, real_estate")
    institution: str | None = Field(None, max_length=100)
    invested_amount: int = Field(gt=0, description="Amount invested in centavos")
    current_value: int = Field(gt=0, description="Current value in centavos")
    interest_rate: int | None = Field(None, ge=0, description="Annual rate in basis points")
    start_date: date | None = None
    maturity_date: date | None = None
    notes: str | None = None


class InvestmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    institution: str | None = Field(None, max_length=100)
    current_value: int | None = Field(None, ge=0)
    interest_rate: int | None = None
    maturity_date: date | None = None
    is_active: bool | None = None
    notes: str | None = None


class InvestmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: str
    institution: str | None
    invested_amount: int
    current_value: int
    interest_rate: int | None
    start_date: date | None
    maturity_date: date | None
    is_active: bool
    notes: str | None
    created_at: datetime
