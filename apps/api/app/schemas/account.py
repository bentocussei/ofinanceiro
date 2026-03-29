import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AccountType, CurrencyCode


class AccountCreate(BaseModel):
    name: str = Field(max_length=100)
    type: AccountType
    currency: CurrencyCode = CurrencyCode.AOA
    balance: int = Field(0, description="Initial balance in centavos")
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    institution: str | None = Field(None, max_length=100)
    sort_order: int = 0


class AccountUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    institution: str | None = Field(None, max_length=100)
    is_archived: bool | None = None
    sort_order: int | None = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    family_id: uuid.UUID | None
    name: str
    type: AccountType
    currency: CurrencyCode
    balance: int
    icon: str | None
    color: str | None
    institution: str | None
    is_archived: bool
    is_shared: bool
    sort_order: int
    created_at: datetime


class AccountSummary(BaseModel):
    total_assets: int
    total_liabilities: int
    net_worth: int
    currency: CurrencyCode
    accounts: list[AccountResponse]
