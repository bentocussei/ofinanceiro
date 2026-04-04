"""Chat router — POST /chat/message + /chat/upload + /chat/stream for the AI assistant."""

import base64
import json
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

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
    # Capture user fields early (ORM object may expire after DB operations)
    user_id = user.id
    user_plan = user.plan

    # Check quota
    can_continue = await check_quota(user_id, user_plan)
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

    # No cache for chat — every response must use fresh financial data
    orchestrator = get_orchestrator()

    try:
        response = await orchestrator.process_message(
            user_id=user_id,
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

    # Record token usage (use captured user_id, not user.id which may be expired)
    await record_token_usage(user_id, response.tokens_input, response.tokens_output)

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


@router.post("/stream")
async def stream_message(
    data: ChatMessageRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    _perm: None = PlanPermission("ai:chat:create"),
):
    """Stream a response with real-time progress via Server-Sent Events.

    Uses the full orchestrator pipeline (routing, tools, skills, memory)
    and emits progress events as tools execute:
      data: {"type": "progress", "content": "A consultar saldos..."}
      data: {"type": "result", "content": "...", "agent": "...", "session_id": "..."}
      data: {"type": "error", "content": "..."}
    """
    user_id = user.id
    user_plan = user.plan

    can_continue = await check_quota(user_id, user_plan)
    if not can_continue:
        raise HTTPException(status_code=429, detail={"code": "QUOTA_EXCEEDED", "message": "Limite diário atingido."})

    session_id = data.session_id or str(uuid.uuid4())
    finance_context = request.headers.get("X-Finance-Context") or request.headers.get("X-Context") or "personal"

    async def event_stream():
        """Generate SSE events with real progress from the orchestrator."""
        try:
            orchestrator = get_orchestrator()

            async for event in orchestrator.process_message_stream(
                user_id=user_id,
                session_id=session_id,
                message=data.message,
                db=db,
                conversation_history=data.conversation_history,
                finance_context=finance_context,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        except Exception:
            yield f"data: {json.dumps({'type': 'error', 'content': 'Erro ao processar mensagem.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
