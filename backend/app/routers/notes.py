"""
Notes router: CRUD, search, and export endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from app.core.security import get_current_user
from app.services import notes_service, inbox_service
from app.services.embedding_service import create_note_chunks
from app.models.notes import (
    CreateNoteRequest,
    UpdateNoteRequest,
    NoteResponse,
    NoteListResponse,
)
from typing import Optional
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/notes", tags=["Notes"])


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    request: CreateNoteRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Create a new text note."""
    user_id = str(user["_id"])

    note = await notes_service.create_note(
        user_id=user_id,
        title=request.title,
        body=request.body,
        capture_type=request.capture_type,
        tags=request.tags,
    )

    note_id = str(note["_id"])

    # Generate embeddings asynchronously (best-effort)
    try:
        await create_note_chunks(
            note_id=note_id,
            user_id=user_id,
            title=request.title,
            body=request.body,
        )
    except Exception as e:
        logger.error("embedding_creation_failed", note_id=note_id, error=str(e))

    # Automatically process in background for Smart Inbox
    try:
        background_tasks.add_task(inbox_service.process_note, note_id, user_id)
    except Exception as e:
        logger.error("auto_inbox_processing_failed", note_id=note_id, error=str(e))

    return notes_service.format_note_response(note)


@router.get("", response_model=NoteListResponse)
async def list_notes(
    user: dict = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    q: Optional[str] = Query(default=None, max_length=500),
    capture_type: Optional[str] = Query(default=None),
):
    """List the user's notes with optional search and filters."""
    user_id = str(user["_id"])

    notes, total = await notes_service.list_notes(
        user_id=user_id,
        page=page,
        page_size=page_size,
        search_query=q,
        capture_type=capture_type,
    )

    return NoteListResponse(
        notes=[notes_service.format_note_response(n) for n in notes],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single note by ID."""
    user_id = str(user["_id"])
    note = await notes_service.get_note(note_id, user_id)

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found.",
        )

    return notes_service.format_note_response(note)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    request: UpdateNoteRequest,
    user: dict = Depends(get_current_user),
):
    """Update a note's title, body, or tags."""
    user_id = str(user["_id"])

    note = await notes_service.update_note(
        note_id=note_id,
        user_id=user_id,
        title=request.title,
        body=request.body,
        tags=request.tags,
    )

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found.",
        )

    # Re-generate embeddings if content changed
    if request.title is not None or request.body is not None:
        try:
            await create_note_chunks(
                note_id=note_id,
                user_id=user_id,
                title=note["title"],
                body=note["body"],
            )
        except Exception as e:
            logger.error("embedding_update_failed", note_id=note_id, error=str(e))

    return notes_service.format_note_response(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a note and its associated data."""
    user_id = str(user["_id"])
    deleted = await notes_service.delete_note(note_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found.",
        )


@router.get("/export/all")
async def export_notes(user: dict = Depends(get_current_user)):
    """Export all notes as JSON."""
    user_id = str(user["_id"])
    notes = await notes_service.export_user_notes(user_id)

    return JSONResponse(
        content={"notes": notes, "count": len(notes)},
        headers={
            "Content-Disposition": "attachment; filename=echomemo_export.json",
        },
    )
