"""Files router: upload, download, delete files via Cloudflare R2."""

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import storage as storage_service

router = APIRouter(prefix="/api/v1/files", tags=["files"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FileResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    mime_type: str
    size: int
    category: str
    entity_type: str | None
    entity_id: str | None
    created_at: str


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str
    size: int
    category: str
    entity_type: str | None = None
    entity_id: str | None = None


class PresignedUrlResponse(BaseModel):
    upload_url: str
    key: str
    filename: str
    expires_in: int


class ConfirmUploadRequest(BaseModel):
    key: str
    original_name: str
    content_type: str
    size: int
    category: str
    entity_type: str | None = None
    entity_id: str | None = None


def _file_to_response(f: "storage_service.File") -> FileResponse:
    return FileResponse(
        id=str(f.id),
        filename=f.filename,
        original_name=f.original_name,
        mime_type=f.mime_type,
        size=f.size,
        category=f.category,
        entity_type=f.entity_type,
        entity_id=str(f.entity_id) if f.entity_id else None,
        created_at=f.created_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# Upload (server-side)
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=FileResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    category: str = "document",
    entity_type: str | None = None,
    entity_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    """Upload ficheiro (server-side). Para ficheiros ate 50MB."""
    eid = uuid.UUID(entity_id) if entity_id else None
    result = await storage_service.upload_file(
        db, user.id, file, category, entity_type, eid,
    )
    return _file_to_response(result)


# ---------------------------------------------------------------------------
# Presigned URL (browser-to-R2 direct upload)
# ---------------------------------------------------------------------------

@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_url(
    data: PresignedUrlRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PresignedUrlResponse:
    """Gerar URL pre-assinado para upload directo do browser ao R2."""
    eid = uuid.UUID(data.entity_id) if data.entity_id else None
    result = await storage_service.get_upload_presigned_url(
        db, user.id, data.filename, data.content_type, data.size,
        data.category, data.entity_type, eid,
    )
    return PresignedUrlResponse(**result)


@router.post("/confirm", response_model=FileResponse, status_code=201)
async def confirm_upload(
    data: ConfirmUploadRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    """Confirmar upload directo (browser-to-R2) e criar registo na BD."""
    eid = uuid.UUID(data.entity_id) if data.entity_id else None
    result = await storage_service.confirm_upload(
        db, user.id, data.key, data.original_name, data.content_type,
        data.size, data.category, data.entity_type, eid,
    )
    return _file_to_response(result)


# ---------------------------------------------------------------------------
# List & Get
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[FileResponse])
async def list_files(
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FileResponse]:
    """Listar ficheiros do utilizador."""
    files = await storage_service.list_user_files(db, user.id, category, limit, offset)
    return [_file_to_response(f) for f in files]


@router.get("/{file_id}")
async def get_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    """Obter detalhes de um ficheiro."""
    f = await storage_service.get_file(db, file_id, user.id)
    if not f:
        raise HTTPException(status_code=404, detail="Ficheiro nao encontrado")
    return _file_to_response(f)


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

@router.get("/{file_id}/download")
async def download_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Obter URL de download (pre-assinado, valido por 1 hora)."""
    url = await storage_service.get_download_url(db, file_id, user.id)
    return {"download_url": url}


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{file_id}")
async def delete_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Eliminar ficheiro."""
    await storage_service.delete_file(db, file_id, user.id)
    return {"message": "Ficheiro eliminado"}
