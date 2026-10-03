"""
Speech service: ElevenLabs text-to-speech integration.
"""

import httpx
from app.core.config import get_settings
import structlog

logger = structlog.get_logger()

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


async def synthesize_speech(text: str) -> bytes | None:
    """
    Convert text to speech using ElevenLabs API.
    Returns audio bytes (MP3) or None if unavailable.
    """
    settings = get_settings()

    if not settings.elevenlabs_configured:
        logger.warning("speech_skipped", reason="elevenlabs_not_configured")
        return None

    # Enforce text length limit
    if len(text) > 5000:
        text = text[:5000]

    url = f"{ELEVENLABS_TTS_URL}/{settings.elevenlabs_voice_id}"

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 200:
                logger.info("speech_generated", text_length=len(text))
                return response.content
            else:
                logger.error(
                    "elevenlabs_error",
                    status_code=response.status_code,
                    detail=response.text[:200],
                )
                return None

    except httpx.TimeoutException:
        logger.error("elevenlabs_timeout")
        return None
    except Exception as e:
        logger.error("speech_failed", error=str(e))
        return None


async def check_speech_status() -> dict:
    """Check if the ElevenLabs service is available."""
    settings = get_settings()

    if not settings.elevenlabs_configured:
        return {
            "available": False,
            "message": "ElevenLabs API is not configured. Set ELEVENLABS_API_KEY to enable speech.",
        }

    return {
        "available": True,
        "message": "Speech synthesis is available.",
    }
