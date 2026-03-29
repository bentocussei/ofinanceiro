import uuid

from pydantic import BaseModel, Field


class TransferRequest(BaseModel):
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    amount: int = Field(gt=0, le=100_000_000_00, description="Amount in centavos")
    description: str | None = Field(None, max_length=500)


class TransferResponse(BaseModel):
    message: str
    from_transaction_id: uuid.UUID
    to_transaction_id: uuid.UUID
