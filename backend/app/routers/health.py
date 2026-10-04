"""
Health check and account management router.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_database, get_client
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models.auth import MessageResponse
from bson import ObjectId
from datetime import datetime, timezone
import structlog

logger = structlog.get_logger()
router = APIRouter(tags=["Health & Account"])


@router.get("/api/v1/health/live")
async def liveness():
    """Liveness check — is the server running?"""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/api/v1/health/ready")
async def readiness():
    """Readiness check — are all dependencies connected?"""
    checks = {}

    # MongoDB
    try:
        client = get_client()
        await client.admin.command("ping")
        checks["mongodb"] = "ok"
    except Exception as e:
        checks["mongodb"] = "error"

    # Gemini
    settings = get_settings()
    checks["gemini"] = "configured" if settings.gemini_configured else "not_configured"
    checks["elevenlabs"] = "configured" if settings.elevenlabs_configured else "not_configured"

    all_ok = checks["mongodb"] == "ok"
    return {
        "status": "ready" if all_ok else "degraded",
        "checks": checks,
    }


DEMO_EMAILS = {"arjun.sharma@iitb.ac.in", "demo@echomemo.ai"}


@router.delete("/api/v1/account", response_model=MessageResponse)
async def delete_account(user: dict = Depends(get_current_user)):
    """
    Delete the current user's account and all associated data.
    Demo accounts cannot be deleted by users — only by an admin directly.
    """
    db = get_database()
    user_id = user["_id"]

    # Protect demo accounts from deletion
    if user.get("email_normalized", "") in DEMO_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo accounts cannot be deleted. This account is managed by the platform.",
        )

    # Delete all user's notes
    await db.notes.delete_many({"user_id": user_id})

    # Delete all user's note chunks/embeddings
    await db.note_chunks.delete_many({"user_id": user_id})

    # Delete all user's tasks
    await db.tasks.delete_many({"user_id": user_id})

    # Delete all user's refresh tokens
    await db.refresh_tokens.delete_many({"user_id": user_id})

    # Delete the user
    await db.users.delete_one({"_id": user_id})

    logger.info("account_deleted", user_id=str(user_id))
    return MessageResponse(message="Account and all associated data have been deleted.")
