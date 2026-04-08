"""Debt schemas — mirrors router schemas with proper typing."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class DebtCreate(BaseModel):
    name: str = Field(max_length=100)
    type: str
    creditor: str | None = None
    original_amount: int = Field(gt=0, description="Amount in centavos")
    current_balance: int | None = None  # defaults to original_amount
    interest_rate: int | None = None  # basis points (1200 = 12%)
    monthly_payment: int | None = None  # centavos
    payment_day: int | None = Field(None, ge=1, le=31)
    start_date: date | None = None
    expected_end_date: date | None = None
    notes: str | None = None
    nature: str | None = None
    creditor_type: str | None = None
    creditor_name: str | None = None  # alias for creditor
    linked_account_id: uuid.UUID | None = None
    auto_pay_enabled: bool | None = None


class DebtUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    type: str | None = None
    creditor: str | None = None
    original_amount: int | None = Field(None, gt=0)
    current_balance: int | None = None
    interest_rate: int | None = None
    monthly_payment: int | None = None
    payment_day: int | None = Field(None, ge=1, le=31)
    start_date: date | None = None
    expected_end_date: date | None = None
    notes: str | None = None
    nature: str | None = None
    creditor_type: str | None = None
    linked_account_id: uuid.UUID | None = None
    auto_pay_enabled: bool | None = None
    is_active: bool | None = None


class PaymentCreate(BaseModel):
    amount: int = Field(gt=0, description="Payment in centavos")
    payment_date: date | None = None  # defaults to today
    from_account_id: uuid.UUID | None = None


class DebtResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    creditor: str | None
    original_amount: int
    current_balance: int
    interest_rate: int | None
    monthly_payment: int | None
    payment_day: int | None
    is_active: bool
    start_date: date | None
    expected_end_date: date | None
    notes: str | None
    created_at: datetime
