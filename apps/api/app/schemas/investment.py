"""Investment schemas — mirrors router schemas with proper typing."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class InvestmentCreate(BaseModel):
    name: str = Field(max_length=100)
    type: str = Field(max_length=50)
    institution: str | None = None
    invested_amount: int = Field(gt=0, description="Amount in centavos")
    current_value: int = Field(gt=0, description="Current value in centavos")
    interest_rate: int | None = None  # basis points
    annual_return_rate: float | None = None  # percentage (12.5 = 12.5%)
    # Dates: must be `date` so Pydantic parses ISO strings into date objects
    # before they reach asyncpg. Previously typed as `str`, asyncpg crashed
    # with "'str' object has no attribute 'toordinal'" on insert. Same fix
    # applied earlier to debt schemas.
    start_date: date | None = None
    maturity_date: date | None = None
    notes: str | None = None
    from_account_id: uuid.UUID | None = None

    def get_interest_rate_bp(self) -> int | None:
        """Return interest rate in basis points, preferring annual_return_rate."""
        if self.annual_return_rate is not None:
            return int(self.annual_return_rate * 100)
        return self.interest_rate


class InvestmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    type: str | None = Field(None, max_length=50)
    institution: str | None = None
    invested_amount: int | None = Field(None, gt=0)
    current_value: int | None = None
    interest_rate: int | None = None
    annual_return_rate: float | None = None
    start_date: date | None = None
    maturity_date: date | None = None
    notes: str | None = None
    is_active: bool | None = None

    def get_interest_rate_bp(self) -> int | None:
        """Return interest rate in basis points, preferring annual_return_rate."""
        if self.annual_return_rate is not None:
            return int(self.annual_return_rate * 100)
        return self.interest_rate


class InvestmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    institution: str | None
    invested_amount: int
    current_value: int
    interest_rate: int | None
    is_active: bool
    start_date: date | None
    maturity_date: date | None
    notes: str | None
    created_at: datetime
