"""Chat router — POST /chat/message for the AI assistant."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.factory import create_llm_router
from app.ai.orchestrator import ChatOrchestrator
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# Create orchestrator (singleton for the router module)
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
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatMessageResponse:
    """Send a message to the AI assistant."""
    session_id = data.session_id or str(uuid.uuid4())
    orchestrator = get_orchestrator()

    response = await orchestrator.process_message(
        user_id=user.id,
        session_id=session_id,
        message=data.message,
        db=db,
        conversation_history=data.conversation_history,
    )

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
