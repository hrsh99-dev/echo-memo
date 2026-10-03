"""
Notes service: CRUD operations with ownership enforcement.
"""

from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from app.core.database import get_database
from app.models.notes import CaptureType, ProcessingStatus
import structlog

logger = structlog.get_logger()


async def create_note(
    user_id: str,
    title: str,
    body: str,
    capture_type: CaptureType = CaptureType.TEXT,
    tags: List[str] = None,
    audio_object_key: Optional[str] = None,
    processing_status: str = ProcessingStatus.READY,
) -> dict:
    """Create a new note for the given user."""
    db = get_database()
    now = datetime.now(timezone.utc)

    note_doc = {
        "user_id": ObjectId(user_id),
        "title": title.strip(),
        "body": body.strip(),
        "capture_type": capture_type,
        "tags": [t.strip().lower() for t in (tags or []) if t.strip()],
        "audio_object_key": audio_object_key,
        "processing_status": processing_status,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.notes.insert_one(note_doc)
    note_doc["_id"] = result.inserted_id

    logger.info("note_created", note_id=str(result.inserted_id), user_id=user_id)
    return note_doc


async def get_note(note_id: str, user_id: str) -> Optional[dict]:
    """Get a note by ID, enforcing user ownership."""
    db = get_database()
    try:
        note = await db.notes.find_one({
            "_id": ObjectId(note_id),
            "user_id": ObjectId(user_id),
        })
        return note
    except Exception:
        return None


async def list_notes(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    search_query: Optional[str] = None,
    capture_type: Optional[str] = None,
) -> tuple:
    """List notes for a user with pagination and optional filters."""
    db = get_database()

    query = {"user_id": ObjectId(user_id)}

    if capture_type:
        query["capture_type"] = capture_type

    if search_query:
        query["$text"] = {"$search": search_query}

    total = await db.notes.count_documents(query)
    skip = (page - 1) * page_size

    cursor = db.notes.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    notes = await cursor.to_list(length=page_size)

    return notes, total


async def update_note(
    note_id: str,
    user_id: str,
    title: Optional[str] = None,
    body: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Optional[dict]:
    """Update a note, enforcing user ownership."""
    db = get_database()

    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if title is not None:
        update_fields["title"] = title.strip()
    if body is not None:
        update_fields["body"] = body.strip()
    if tags is not None:
        update_fields["tags"] = [t.strip().lower() for t in tags if t.strip()]

    result = await db.notes.find_one_and_update(
        {"_id": ObjectId(note_id), "user_id": ObjectId(user_id)},
        {"$set": update_fields},
        return_document=True,
    )

    if result:
        logger.info("note_updated", note_id=note_id, user_id=user_id)

    return result


async def delete_note(note_id: str, user_id: str) -> bool:
    """Delete a note and its associated chunks, enforcing user ownership."""
    db = get_database()

    result = await db.notes.delete_one({
        "_id": ObjectId(note_id),
        "user_id": ObjectId(user_id),
    })

    if result.deleted_count > 0:
        # Delete associated chunks/embeddings
        await db.note_chunks.delete_many({
            "note_id": ObjectId(note_id),
            "user_id": ObjectId(user_id),
        })
        logger.info("note_deleted", note_id=note_id, user_id=user_id)
        return True

    return False


async def export_user_notes(user_id: str) -> List[dict]:
    """Export all notes for a user."""
    db = get_database()
    cursor = db.notes.find(
        {"user_id": ObjectId(user_id)},
        {"_id": 0, "user_id": 0, "audio_object_key": 0},
    ).sort("created_at", -1)

    notes = await cursor.to_list(length=10000)

    # Convert datetimes to ISO strings for JSON export
    for note in notes:
        for field in ["created_at", "updated_at"]:
            if field in note and isinstance(note[field], datetime):
                note[field] = note[field].isoformat()

    return notes


def format_note_response(note: dict) -> dict:
    """Format a MongoDB note document to an API response."""
    return {
        "id": str(note["_id"]),
        "title": note.get("title", ""),
        "body": note.get("body", ""),
        "capture_type": note.get("capture_type", "text"),
        "tags": note.get("tags", []),
        "processing_status": note.get("processing_status", "ready"),
        "created_at": note.get("created_at", "").isoformat() if isinstance(note.get("created_at"), datetime) else str(note.get("created_at", "")),
        "updated_at": note.get("updated_at", "").isoformat() if isinstance(note.get("updated_at"), datetime) else str(note.get("updated_at", "")),
        "has_audio": bool(note.get("audio_object_key")),
    }
