"""Voice router: audio upload -> transcription.

Single endpoint for speech-to-text. The transcribed text is then sent to
the regular chat endpoint (/api/v1/chat/stream) by the client. This keeps
responsibilities separated: transcription here, chat orchestration in chat.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User
from app.services.voice import transcribe_audio_bytes

router = APIRouter(prefix="/api/v1/chat", tags=["voice"])


class TranscriptionResponse(BaseModel):
    text: str


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> TranscriptionResponse:
    """Transcribe an audio file to text.

    Accepts multipart audio upload (m4a, mp3, wav, webm). Returns only the
    transcription string. The client uses this for voice-to-text input;
    the transcribed text is then sent through the normal chat flow.
    """
    content = await file.read()
    filename = file.filename or "audio.m4a"

    result = await transcribe_audio_bytes(content, filename)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    return TranscriptionResponse(text=result["text"])
