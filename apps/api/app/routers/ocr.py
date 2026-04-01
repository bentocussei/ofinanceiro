"""OCR router: receipt image processing."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.ocr import extract_receipt_data, validate_receipt_data

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])


class ReceiptUploadRequest(BaseModel):
    image_base64: str = Field(max_length=10_000_000, description="Base64 encoded receipt image (max ~7.5MB)")


@router.post("/receipt")
async def process_receipt(
    data: ReceiptUploadRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Process a receipt image and extract transaction data."""
    result = await extract_receipt_data(data.image_base64)

    if result.get("success") and result.get("data"):
        validation = validate_receipt_data(result["data"])
        return {
            "success": True,
            "data": validation["data"],
            "valid": validation["valid"],
            "issues": validation["issues"],
        }

    return result
