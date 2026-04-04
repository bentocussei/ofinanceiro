"""Debt schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DebtNature, DebtType


class DebtCreate(BaseModel):
    name: str = Field(max_length=100)
    type: DebtType = DebtType.PERSONAL_LOAN
    creditor: str | None = Field(None, max_length=200)
    original_amount: int = Field(gt=0, description="Original amount in centavos")
    current_balance: int = Field(gt=0, description="Current balance in centavos")
    interest_rate: int | None = Field(None, ge=0, description="Annual rate in basis points (1200 = 12%)")
    monthly_payment: int | None = Field(None, gt=0, description="Monthly payment in centavos")
    payment_day: int | None = Field(None, ge=1, le=31)
    start_date: date | None = None
    expected_end_date: date | None = None
    nature: DebtNature = DebtNature.FORMAL
    notes: str | None = None


class DebtUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    creditor: str | None = Field(None, max_length=200)
    current_balance: int | None = Field(None, ge=0)
    interest_rate: int | None = None
    monthly_payment: int | None = None
    payment_day: int | None = Field(None, ge=1, le=31)
    expected_end_date: date | None = None
    is_active: bool | None = None
    notes: str | None = None


class DebtResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: DebtType
    creditor: str | None
    original_amount: int
    current_balance: int
    interest_rate: int | None
    monthly_payment: int | None
    payment_day: int | None
    start_date: date | None
    expected_end_date: date | None
    is_active: bool
    nature: DebtNature
    notes: str | None
    created_at: datetime
