"""
Ask Echo router: retrieval-grounded Q&A and speech synthesis.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import Response
from app.core.security import get_current_user
from app.services.assistant_service import generate_answer
from app.services.speech_service import synthesize_speech, check_speech_status
from app.services.embedding_service import semantic_search
from app.models.assistant import AskRequest, AskResponse, SpeechRequest, SpeechStatusResponse
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1", tags=["Assistant"])


@router.post("/ask", response_model=AskResponse)
async def ask_echo(
    request: AskRequest,
    user: dict = Depends(get_current_user),
):
    """Ask a question grounded in the user's saved notes."""
    user_id = str(user["_id"])

    result = await generate_answer(user_id, request.question)

    return AskResponse(
        answer=result["answer"],
        sources=[
            {
                "note_id": s["note_id"],
                "title": s["title"],
                "excerpt": s["excerpt"],
                "relevance_score": s.get("relevance_score", 0.0),
            }
            for s in result["sources"]
        ],
        disclaimer=result["disclaimer"],
    )


@router.post("/search")
async def search_notes(
    request: AskRequest,
    user: dict = Depends(get_current_user),
):
    """Semantic search over the user's notes."""
    user_id = str(user["_id"])

    results = await semantic_search(user_id, request.question, limit=10)

    return {
        "results": [
            {
                "note_id": r.get("note_id", ""),
                "title": r.get("title", ""),
                "excerpt": r.get("excerpt", "")[:300],
                "score": round(r.get("score", 0.0), 3),
            }
            for r in results
        ],
        "count": len(results),
    }


@router.post("/speech")
async def text_to_speech(
    request: SpeechRequest,
    user: dict = Depends(get_current_user),
):
    """Convert text to speech using ElevenLabs."""
    audio_bytes = await synthesize_speech(request.text)

    if audio_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Speech synthesis is not available. Check ElevenLabs configuration.",
        )

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "private, no-store",
            "Content-Disposition": "inline; filename=speech.mp3",
        },
    )


@router.get("/speech/status", response_model=SpeechStatusResponse)
async def speech_status(user: dict = Depends(get_current_user)):
    """Check if speech synthesis is available."""
    status_info = await check_speech_status()
    return SpeechStatusResponse(**status_info)
