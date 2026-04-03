"""OCR router: receipt image processing with R2 storage."""

import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
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
    """Process a receipt image (base64) and extract transaction data."""
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


@router.post("/receipt/upload")
async def process_receipt_file(
    file: UploadFile = File(...),
    transaction_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Upload receipt photo, save to R2, and extract transaction data via OCR.

    The photo is permanently stored and linked to the transaction (if provided).
    """
    import base64
    from app.services import storage as storage_service

    # Save photo to R2
    entity_id = uuid.UUID(transaction_id) if transaction_id else None
    file_record = await storage_service.upload_file(
        db, user.id, file, category="receipt_photo",
        entity_type="transaction" if transaction_id else None,
        entity_id=entity_id,
    )

    # Read content for OCR (re-read from upload since storage already consumed it)
    # We need to get the content — use the stored path to generate a download URL
    # OR re-read from the file before it's consumed. Let's re-fetch from R2.
    from app.services.storage import _get_r2_client
    from app.config import settings

    client = _get_r2_client()
    image_base64 = ""
    if client:
        try:
            response = client.get_object(Bucket=settings.r2_bucket_name, Key=file_record.path)
            content = response["Body"].read()
            image_base64 = base64.b64encode(content).decode("ascii")
        except Exception:
            pass

    # Process OCR
    ocr_result: dict = {"success": False, "message": "OCR nao disponivel"}
    if image_base64:
        ocr_result = await extract_receipt_data(image_base64)

    # Build response
    response: dict = {
        "file_id": str(file_record.id),
        "file_url": file_record.path,
        "ocr": ocr_result,
    }

    if ocr_result.get("success") and ocr_result.get("data"):
        validation = validate_receipt_data(ocr_result["data"])
        response["ocr"] = {
            "success": True,
            "data": validation["data"],
            "valid": validation["valid"],
            "issues": validation["issues"],
        }

    return response
