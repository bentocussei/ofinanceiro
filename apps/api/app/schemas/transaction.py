import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TransactionType


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID | None = None
    amount: int = Field(gt=0, le=100_000_000_00, description="Amount in centavos")
    type: TransactionType
    description: str | None = Field(None, max_length=500)
    merchant: str | None = Field(None, max_length=200)
    tags: list[str] = Field(default_factory=list)
    transaction_date: date = Field(default_factory=date.today)
    notes: str | None = None
    is_private: bool = False
    needs_review: bool = False
    client_id: uuid.UUID | None = None


class TransactionUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    amount: int | None = Field(None, gt=0, le=100_000_000_00)
    type: TransactionType | None = None
    description: str | None = Field(None, max_length=500)
    merchant: str | None = Field(None, max_length=200)
    tags: list[str] | None = None
    transaction_date: date | None = None
    notes: str | None = None
    is_private: bool | None = None
    needs_review: bool | None = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID | None
    amount: int
    type: TransactionType
    description: str | None
    merchant: str | None
    tags: list[str]
    is_recurring: bool
    needs_review: bool
    is_private: bool
    notes: str | None
    transaction_date: date
    created_at: datetime
    source_type: str | None = None
    source_id: uuid.UUID | None = None


class TransactionFilter(BaseModel):
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    type: TransactionType | None = None
    date_from: date | None = None
    date_to: date | None = None
    min_amount: int | None = None
    max_amount: int | None = None
    search: str | None = None
