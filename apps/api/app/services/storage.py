"""File storage service — Cloudflare R2 (S3-compatible).

Handles upload, download (presigned URLs), and delete operations.
Adapted from gseducation's file.service.ts for Python/FastAPI.
"""

import hashlib
import logging
import time
import uuid
from datetime import datetime, timezone

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.file import File

logger = logging.getLogger(__name__)

# File validation rules per category
CATEGORY_RULES: dict[str, dict] = {
    "receipt_photo": {
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
        "max_size": 10 * 1024 * 1024,  # 10MB
    },
    "bank_import": {
        "allowed_types": [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        "max_size": 50 * 1024 * 1024,  # 50MB
    },
    "avatar": {
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
        "max_size": 2 * 1024 * 1024,  # 2MB
    },
    "document": {
        "allowed_types": [
            "application/pdf",
            "image/jpeg",
            "image/png",
        ],
        "max_size": 20 * 1024 * 1024,  # 20MB
    },
}

# Default rules for unknown categories
_DEFAULT_RULES = {
    "allowed_types": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    "max_size": 10 * 1024 * 1024,
}


def _get_r2_client():
    """Create a boto3 S3 client configured for Cloudflare R2."""
    if not settings.r2_endpoint:
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        ),
    )


def _generate_storage_key(
    user_id: uuid.UUID,
    category: str,
    original_name: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> tuple[str, str]:
    """Generate a unique storage key for R2.

    Returns (storage_key, hashed_filename).
    Pattern: users/{user_id}/{category}/{timestamp}-{hash}{ext}
    """
    ext = ""
    if "." in original_name:
        ext = "." + original_name.rsplit(".", 1)[-1].lower()

    hash_input = f"{user_id}{time.time()}{original_name}"
    file_hash = hashlib.md5(hash_input.encode()).hexdigest()[:12]
    hashed_name = f"{int(time.time())}-{file_hash}{ext}"

    if entity_type and entity_id:
        key = f"users/{user_id}/{category}/{entity_type}/{entity_id}/{hashed_name}"
    else:
        key = f"users/{user_id}/{category}/{hashed_name}"

    return key, hashed_name


def _validate_file(
    content_type: str,
    size: int,
    category: str,
) -> None:
    """Validate file type and size against category rules."""
    rules = CATEGORY_RULES.get(category, _DEFAULT_RULES)

    if content_type not in rules["allowed_types"]:
        allowed = ", ".join(rules["allowed_types"])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de ficheiro nao permitido. Tipos aceites: {allowed}",
        )

    if size > rules["max_size"]:
        max_mb = rules["max_size"] // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ficheiro muito grande. Maximo: {max_mb}MB",
        )


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

async def upload_file(
    db: AsyncSession,
    user_id: uuid.UUID,
    file: UploadFile,
    category: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> File:
    """Upload a file to R2 and create a database record.

    For small-to-medium files (up to 50MB). Uses server-side upload.
    """
    client = _get_r2_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servico de storage nao configurado",
        )

    # Read file content
    content = await file.read()
    size = len(content)
    content_type = file.content_type or "application/octet-stream"
    original_name = file.filename or "ficheiro"

    # Validate
    _validate_file(content_type, size, category)

    # Generate key
    storage_key, hashed_name = _generate_storage_key(
        user_id, category, original_name, entity_type, entity_id
    )

    # Upload to R2
    try:
        client.put_object(
            Bucket=settings.r2_bucket_name,
            Key=storage_key,
            Body=content,
            ContentType=content_type,
        )
    except ClientError as e:
        logger.exception("R2 upload failed for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erro ao guardar ficheiro",
        ) from e

    # If avatar, delete previous
    if category == "avatar":
        await _delete_previous_avatar(db, user_id, client)

    # Create DB record
    file_record = File(
        user_id=user_id,
        filename=hashed_name,
        original_name=original_name,
        mime_type=content_type,
        size=size,
        path=storage_key,
        category=category,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(file_record)
    await db.commit()
    await db.refresh(file_record)

    logger.info("File uploaded: %s (%d bytes) for user %s", storage_key, size, user_id)
    return file_record


# ---------------------------------------------------------------------------
# Presigned URL (for browser-to-R2 direct upload)
# ---------------------------------------------------------------------------

async def get_upload_presigned_url(
    db: AsyncSession,
    user_id: uuid.UUID,
    filename: str,
    content_type: str,
    size: int,
    category: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> dict:
    """Generate a presigned PUT URL for browser-to-R2 direct upload.

    Returns: { upload_url, key, filename, expires_in }
    """
    client = _get_r2_client()
    if not client:
        raise HTTPException(status_code=503, detail="Storage nao configurado")

    _validate_file(content_type, size, category)

    storage_key, hashed_name = _generate_storage_key(
        user_id, category, filename, entity_type, entity_id
    )

    try:
        upload_url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.r2_bucket_name,
                "Key": storage_key,
                "ContentType": content_type,
            },
            ExpiresIn=900,  # 15 minutes
        )
    except ClientError as e:
        logger.exception("Failed to generate presigned URL")
        raise HTTPException(status_code=502, detail="Erro ao gerar URL de upload") from e

    return {
        "upload_url": upload_url,
        "key": storage_key,
        "filename": hashed_name,
        "expires_in": 900,
    }


async def confirm_upload(
    db: AsyncSession,
    user_id: uuid.UUID,
    key: str,
    original_name: str,
    content_type: str,
    size: int,
    category: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> File:
    """Confirm a browser-to-R2 direct upload by verifying the file exists."""
    client = _get_r2_client()
    if not client:
        raise HTTPException(status_code=503, detail="Storage nao configurado")

    # Verify file exists in R2
    try:
        client.head_object(Bucket=settings.r2_bucket_name, Key=key)
    except ClientError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ficheiro nao encontrado no storage. Upload pode ter falhado.",
        )

    hashed_name = key.rsplit("/", 1)[-1] if "/" in key else key

    # If avatar, delete previous
    if category == "avatar":
        await _delete_previous_avatar(db, user_id, client)

    file_record = File(
        user_id=user_id,
        filename=hashed_name,
        original_name=original_name,
        mime_type=content_type,
        size=size,
        path=key,
        category=category,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(file_record)
    await db.commit()
    await db.refresh(file_record)
    return file_record


# ---------------------------------------------------------------------------
# Download (presigned GET URL)
# ---------------------------------------------------------------------------

async def get_download_url(
    db: AsyncSession,
    file_id: uuid.UUID,
    user_id: uuid.UUID,
    expires_in: int = 3600,
) -> str:
    """Get a presigned download URL for a file.

    If R2_PUBLIC_URL is set, returns direct CDN URL instead.
    """
    file = await db.get(File, file_id)
    if not file or file.user_id != user_id or file.is_deleted:
        raise HTTPException(status_code=404, detail="Ficheiro nao encontrado")

    # CDN URL (if configured)
    if settings.r2_public_url:
        return f"{settings.r2_public_url}/{file.path}"

    client = _get_r2_client()
    if not client:
        raise HTTPException(status_code=503, detail="Storage nao configurado")

    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.r2_bucket_name, "Key": file.path},
            ExpiresIn=expires_in,
        )
        return url
    except ClientError as e:
        logger.exception("Failed to generate download URL for file %s", file_id)
        raise HTTPException(status_code=502, detail="Erro ao gerar URL de download") from e


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

async def delete_file(
    db: AsyncSession,
    file_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Soft-delete a file. Hard-delete from R2 immediately."""
    file = await db.get(File, file_id)
    if not file or file.user_id != user_id:
        raise HTTPException(status_code=404, detail="Ficheiro nao encontrado")

    if file.is_deleted:
        return

    # Hard-delete from R2
    client = _get_r2_client()
    if client:
        try:
            client.delete_object(Bucket=settings.r2_bucket_name, Key=file.path)
        except ClientError:
            logger.warning("Failed to delete %s from R2", file.path)

    # Soft-delete in DB
    file.is_deleted = True
    file.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

async def list_user_files(
    db: AsyncSession,
    user_id: uuid.UUID,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[File]:
    """List files for a user, optionally filtered by category."""
    stmt = (
        select(File)
        .where(File.user_id == user_id, File.is_deleted.is_(False))
    )
    if category:
        stmt = stmt.where(File.category == category)
    stmt = stmt.order_by(File.created_at.desc()).limit(limit).offset(offset)
    result = await db.scalars(stmt)
    return list(result.all())


async def get_file(
    db: AsyncSession,
    file_id: uuid.UUID,
    user_id: uuid.UUID,
) -> File | None:
    """Get a single file by ID (must belong to user)."""
    file = await db.get(File, file_id)
    if not file or file.user_id != user_id or file.is_deleted:
        return None
    return file


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _delete_previous_avatar(
    db: AsyncSession,
    user_id: uuid.UUID,
    client,
) -> None:
    """Delete previous avatar when uploading a new one."""
    result = await db.scalars(
        select(File).where(
            File.user_id == user_id,
            File.category == "avatar",
            File.is_deleted.is_(False),
        )
    )
    for old_file in result.all():
        try:
            client.delete_object(Bucket=settings.r2_bucket_name, Key=old_file.path)
        except ClientError:
            pass
        old_file.is_deleted = True
        old_file.deleted_at = datetime.now(timezone.utc)
