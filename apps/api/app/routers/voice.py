"""Voice router: audio upload → transcription → chat."""

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.factory import create_llm_router
from app.ai.orchestrator import ChatOrchestrator
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import ChatMessageResponse
from app.services.voice import transcribe_audio

router = APIRouter(prefix="/api/v1/chat", tags=["voice"])


class VoiceRequest(BaseModel):
    audio_base64: str = Field(description="Base64 encoded audio")
    session_id: str | None = None


_orchestrator: ChatOrchestrator | None = None


def get_orchestrator() -> ChatOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ChatOrchestrator(create_llm_router())
    return _orchestrator


@router.post("/voice", response_model=ChatMessageResponse)
async def voice_message(
    data: VoiceRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatMessageResponse:
    """Process voice input: transcribe → chat."""
    # 1. Transcribe
    result = await transcribe_audio(data.audio_base64)
    if "error" in result:
        return ChatMessageResponse(
            content=f"Erro na transcrição: {result['error']}",
            agent="system",
            session_id=data.session_id or str(uuid.uuid4()),
        )

    text = result["text"]
    session_id = data.session_id or str(uuid.uuid4())

    # 2. Process as normal chat message
    orchestrator = get_orchestrator()
    response = await orchestrator.process_message(
        user_id=user.id,
        session_id=session_id,
        message=text,
        db=db,
    )

    return ChatMessageResponse(
        content=response.content,
        agent=response.agent_name,
        session_id=session_id,
        tokens_input=response.tokens_input,
        tokens_output=response.tokens_output,
        model=response.model,
    )
