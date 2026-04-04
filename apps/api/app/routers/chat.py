"""Chat router — POST /chat/message + /chat/upload for the AI assistant."""

import base64
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.cache import get_cached_response, set_cached_response
from app.ai.llm.factory import create_llm_router
from app.ai.metering import check_quota, record_token_usage
from app.ai.orchestrator import ChatOrchestrator
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.user import User
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

_orchestrator: ChatOrchestrator | None = None


def get_orchestrator() -> ChatOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        llm_router = create_llm_router()
        _orchestrator = ChatOrchestrator(llm_router)
    return _orchestrator


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    data: ChatMessageRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    _perm: None = PlanPermission("ai:chat:create"),
) -> ChatMessageResponse:
    """Send a message to the AI assistant."""
    # Check quota
    can_continue = await check_quota(user.id, user.plan)
    if not can_continue:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "QUOTA_EXCEEDED",
                "message": "Atingiste o limite diario de perguntas. Actualiza o teu plano para mais.",
            },
        )

    session_id = data.session_id or str(uuid.uuid4())

    # Get finance context from X-Finance-Context or X-Context header
    finance_context = (
        request.headers.get("X-Finance-Context")
        or request.headers.get("X-Context")
        or "personal"
    )

    # Check L1 cache for exact match
    cached = await get_cached_response(str(user.id), data.message)
    if cached:
        return ChatMessageResponse(
            content=cached,
            agent="cache",
            session_id=session_id,
        )

    orchestrator = get_orchestrator()

    try:
        response = await orchestrator.process_message(
            user_id=user.id,
            session_id=session_id,
            message=data.message,
            db=db,
            conversation_history=data.conversation_history,
            finance_context=finance_context,
        )
    except RuntimeError:
        return ChatMessageResponse(
            content="O assistente de IA nao esta disponivel de momento. Por favor, tente novamente mais tarde.",
            agent="system",
            session_id=session_id,
        )

    # Record token usage
    await record_token_usage(user.id, response.tokens_input, response.tokens_output)

    # Cache the response (L1)
    if response.content and not response.needs_confirmation:
        await set_cached_response(str(user.id), data.message, response.content)

    return ChatMessageResponse(
        content=response.content,
        agent=response.agent_name,
        session_id=session_id,
        needs_confirmation=response.needs_confirmation,
        confirmation_data=response.confirmation_data,
        tokens_input=response.tokens_input,
        tokens_output=response.tokens_output,
        model=response.model,
    )


@router.post("/upload", response_model=ChatMessageResponse)
async def send_file(
    file: UploadFile = File(...),
    message: str = Form(""),
    session_id: str = Form(""),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    _perm: None = PlanPermission("ai:chat:create"),
) -> ChatMessageResponse:
    """Send a file (image/PDF) to the AI assistant.

    Image → OCR (receipt extraction)
    PDF/CSV → Bank statement import
    No message → assistant asks what to do
    """
    can_continue = await check_quota(user.id, user.plan)
    if not can_continue:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "QUOTA_EXCEEDED", "message": "Limite diario atingido."},
        )

    sid = session_id or str(uuid.uuid4())
    finance_context = (
        request.headers.get("X-Finance-Context")
        or request.headers.get("X-Context")
        or "personal"
    ) if request else "personal"

    content_type = file.content_type or ""
    file_bytes = await file.read()
    filename = file.filename or "ficheiro"

    # Determine what to do based on file type
    is_image = content_type.startswith("image/")
    is_pdf = content_type == "application/pdf"
    is_csv = content_type in ("text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    if is_image:
        # Save to R2 and run OCR
        from app.services import storage as storage_service
        from app.services.ocr import extract_receipt_data

        # Save
        await file.seek(0)
        file_record = await storage_service.upload_file(
            db, user.id, file, category="receipt_photo",
        )

        # OCR
        image_b64 = base64.b64encode(file_bytes).decode("ascii")
        ocr_result = await extract_receipt_data(image_b64)

        if ocr_result.get("success") and ocr_result.get("data"):
            data = ocr_result["data"]
            auto_message = (
                f"Enviei uma foto de recibo. O OCR extraiu:\n"
                f"- Comerciante: {data.get('merchant', '?')}\n"
                f"- Total: {data.get('total', '?')} Kz\n"
                f"- Data: {data.get('date', '?')}\n"
                f"Quero registar esta transaccao."
            )
        else:
            auto_message = message or f"Enviei uma imagem ({filename}). O que devo fazer com ela?"

    elif is_csv:
        auto_message = message or f"Enviei um extracto bancario ({filename}). Podes analisar e importar as transaccoes?"

    elif is_pdf:
        auto_message = message or f"Enviei um PDF ({filename}). Podes analisar este documento?"

    else:
        auto_message = message or f"Enviei um ficheiro ({filename}, {content_type}). O que posso fazer com ele?"

    # Process through orchestrator
    orchestrator = get_orchestrator()
    try:
        response = await orchestrator.process_message(
            user_id=user.id,
            session_id=sid,
            message=auto_message,
            db=db,
            finance_context=finance_context,
        )
    except RuntimeError:
        return ChatMessageResponse(
            content="O assistente nao esta disponivel de momento.",
            agent="system",
            session_id=sid,
        )

    await record_token_usage(user.id, response.tokens_input, response.tokens_output)

    return ChatMessageResponse(
        content=response.content,
        agent=response.agent_name,
        session_id=sid,
        tokens_input=response.tokens_input,
        tokens_output=response.tokens_output,
        model=response.model,
    )
