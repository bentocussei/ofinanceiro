"""Voice service: speech-to-text using OpenAI transcription.

Requires OPENAI_API_KEY. Returns clear error if not configured.
"""

import io
import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.m4a") -> dict:
    """Transcribe raw audio bytes to text using OpenAI transcription.

    Returns {"text": "transcription"} or {"error": "message"}.
    Uses gpt-4o-mini-transcribe with Portuguese language hint.
    """
    if not settings.openai_api_key:
        return {"error": "Servico de transcricao de voz nao esta disponivel de momento."}

    try:
        import openai

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        transcription = await client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
            language="pt",
        )

        return {"text": transcription.text}

    except Exception:
        logger.exception("Voice transcription failed")
        return {"error": "Erro na transcricao de voz. Tente novamente."}
