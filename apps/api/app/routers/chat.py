"""Chat router — POST /chat/message for the AI assistant."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
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
