"""
Transcription service: ElevenLabs speech-to-text integration.
"""

import httpx
from app.core.config import get_settings
import structlog

logger = structlog.get_logger()

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"

# Supported audio MIME types
SUPPORTED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/ogg",
    "audio/flac",
    "audio/x-wav",
    "audio/webm;codecs=opus",
}


def validate_audio_type(content_type: str) -> bool:
    """Check if the content type is a supported audio format."""
    base_type = content_type.split(";")[0].strip().lower()
    return base_type in SUPPORTED_AUDIO_TYPES or content_type in SUPPORTED_AUDIO_TYPES


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """
    Transcribe audio using ElevenLabs Speech-to-Text API.
    Returns { "text": "...", "success": True/False, "error": "..." }
    """
    settings = get_settings()

    if not settings.elevenlabs_configured:
        return {
            "text": "",
            "success": False,
            "error": "Transcription service is not configured. Set ELEVENLABS_API_KEY to enable.",
        }

    # Validate size
    if len(audio_bytes) > settings.audio_max_bytes:
        return {
            "text": "",
            "success": False,
            "error": f"Audio file exceeds maximum size of {settings.audio_max_bytes // 1_048_576} MB.",
        }

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {
                "file": (filename, audio_bytes, "audio/webm"),
            }
            data = {
                "model_id": "scribe_v1",
            }

            response = await client.post(
                ELEVENLABS_STT_URL,
                files=files,
                data=data,
                headers=headers,
            )

            if response.status_code == 200:
                result = response.json()
                transcript = result.get("text", "")
                logger.info("transcription_complete", length=len(transcript))
                return {
                    "text": transcript,
                    "success": True,
                    "error": None,
                }
            else:
                logger.error(
                    "transcription_error",
                    status_code=response.status_code,
                    detail=response.text[:200],
                )
                return {
                    "text": "",
                    "success": False,
                    "error": "Transcription failed. Please try again.",
                }

    except httpx.TimeoutException:
        logger.error("transcription_timeout")
        return {
            "text": "",
            "success": False,
            "error": "Transcription timed out. Please try a shorter recording.",
        }
    except Exception as e:
        logger.error("transcription_failed", error=str(e))
        return {
            "text": "",
            "success": False,
            "error": "An unexpected error occurred during transcription.",
        }
