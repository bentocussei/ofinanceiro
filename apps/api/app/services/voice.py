"""Voice service: speech-to-text using Whisper API.

Note: Requires OpenAI API key for Whisper.
In dev without API key, returns a mock transcription.
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def transcribe_audio(audio_base64: str) -> dict:
    """Transcribe audio to text using Whisper API.
    Returns {"text": "transcription"} or {"error": "message"}.
    """
    if not settings.openai_api_key:
        logger.info("DEV MODE — Whisper not available, returning mock transcription")
        return {"text": "[Transcrição de voz não disponível sem API key OpenAI]", "mock": True}

    try:
        import base64
        import io

        import openai

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

        audio_bytes = base64.b64decode(audio_base64)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.webm"

        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="pt",
        )

        return {"text": transcription.text}

    except Exception as e:
        logger.exception("Voice transcription failed")
        return {"error": str(e)}
