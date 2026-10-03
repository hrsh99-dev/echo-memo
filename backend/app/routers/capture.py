"""
Capture router: audio upload and transcription.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, BackgroundTasks
from app.core.security import get_current_user
from app.core.config import get_settings
from app.services.transcription_service import transcribe_audio, validate_audio_type
from app.services import notes_service, inbox_service
from app.services.embedding_service import create_note_chunks
from app.models.notes import CaptureType, ProcessingStatus
from typing import Optional
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/capture", tags=["Capture"])


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    user: dict = Depends(get_current_user),
):
    """
    Upload audio for transcription.
    Returns the transcript for review before saving.
    """
    settings = get_settings()

    # Validate content type
    content_type = file.content_type or ""
    if not validate_audio_type(content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {content_type}. Supported: webm, wav, mp3, mp4, ogg, flac.",
        )

    # Read and validate size
    audio_bytes = await file.read()
    if len(audio_bytes) > settings.audio_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds maximum size of {settings.audio_max_bytes // 1_048_576} MB.",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is empty.",
        )

    # Transcribe
    result = await transcribe_audio(audio_bytes, file.filename or "audio.webm")

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result["error"],
        )

    return {
        "transcript": result["text"],
        "success": True,
        "message": "Transcription complete. Review and save your note.",
    }


@router.post("/save-voice-note")
async def save_voice_note(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    body: str = Form(...),
    user: dict = Depends(get_current_user),
):
    """
    Save a voice note after the user has reviewed the transcript.
    Called after transcription is complete and the user approves/edits the text.
    """
    user_id = str(user["_id"])

    if not title.strip():
        title = "Voice Note"

    if not body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note body cannot be empty.",
        )

    note = await notes_service.create_note(
        user_id=user_id,
        title=title.strip(),
        body=body.strip(),
        capture_type=CaptureType.VOICE,
        processing_status=ProcessingStatus.READY,
    )

    note_id = str(note["_id"])

    # Generate embeddings
    try:
        await create_note_chunks(
            note_id=note_id,
            user_id=user_id,
            title=title,
            body=body,
        )
    except Exception as e:
        logger.error("voice_note_embedding_failed", error=str(e))

    # Auto-process in background for Smart Inbox
    try:
        background_tasks.add_task(inbox_service.process_note, note_id, user_id)
    except Exception as e:
        logger.error("auto_inbox_processing_voice_failed", note_id=note_id, error=str(e))

    return notes_service.format_note_response(note)
