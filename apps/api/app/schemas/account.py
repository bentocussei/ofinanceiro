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
    iban: str | None = Field(None, max_length=34)
    nib: str | None = Field(None, max_length=21)
    swift_code: str | None = Field(None, max_length=11)
    account_holder: str | None = Field(None, max_length=100)
    sort_order: int = 0


class AccountUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=7)
    institution: str | None = Field(None, max_length=100)
    iban: str | None = None
    nib: str | None = None
    swift_code: str | None = None
    account_holder: str | None = None
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
    iban: str | None
    nib: str | None
    swift_code: str | None
    account_holder: str | None
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
