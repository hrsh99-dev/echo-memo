"""
Inbox router: Smart Inbox processing and review endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.security import get_current_user
from app.services import inbox_service
from app.models.inbox import (
    ProcessNoteRequest,
    AcceptItemsRequest,
    RejectItemsRequest,
    InboxItemResponse,
    InboxListResponse,
    ProcessingResultResponse,
    AcceptResultResponse,
)
from typing import Optional
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/inbox", tags=["Smart Inbox"])


@router.get("", response_model=InboxListResponse)
async def list_inbox_items(
    user: dict = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    category: Optional[str] = Query(default=None),
    processing_status: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=500),
):
    """List inbox items (notes with AI metadata)."""
    user_id = str(user["_id"])

    notes, total = await inbox_service.get_inbox_items(
        user_id=user_id,
        page=page,
        page_size=page_size,
        category=category,
        processing_status=processing_status,
        search_query=q,
    )

    return InboxListResponse(
        items=[inbox_service.format_inbox_item(n) for n in notes],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{note_id}", response_model=InboxItemResponse)
async def get_inbox_item(
    note_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single note with its full inbox metadata."""
    user_id = str(user["_id"])
    note = await inbox_service.get_inbox_item(note_id, user_id)

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found.",
        )

    return inbox_service.format_inbox_item(note)


@router.post("/{note_id}/process", response_model=ProcessingResultResponse)
async def process_note(
    note_id: str,
    request: ProcessNoteRequest = ProcessNoteRequest(),
    user: dict = Depends(get_current_user),
):
    """Trigger AI processing for a note."""
    user_id = str(user["_id"])

    result = await inbox_service.process_note(note_id, user_id, force=request.force)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("error", "Processing failed"),
        )

    return ProcessingResultResponse(
        note_id=note_id,
        processing_status=result["metadata"].get("processing_status", "completed") if result.get("metadata") else "failed",
        metadata=result.get("metadata"),
        message=result.get("message", "Processed"),
    )


@router.post("/{note_id}/accept", response_model=AcceptResultResponse)
async def accept_suggestions(
    note_id: str,
    request: AcceptItemsRequest,
    user: dict = Depends(get_current_user),
):
    """Accept specific extracted items and create tasks from them."""
    user_id = str(user["_id"])

    result = await inbox_service.accept_items(
        note_id=note_id,
        user_id=user_id,
        item_indices=request.item_indices,
        edits=request.edits,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Acceptance failed"),
        )

    return AcceptResultResponse(
        accepted_count=result["accepted_count"],
        tasks_created=result["tasks_created"],
        message=result["message"],
    )


@router.post("/{note_id}/reject")
async def reject_suggestions(
    note_id: str,
    request: RejectItemsRequest,
    user: dict = Depends(get_current_user),
):
    """Reject specific extracted items."""
    user_id = str(user["_id"])

    result = await inbox_service.reject_items(
        note_id=note_id,
        user_id=user_id,
        item_indices=request.item_indices,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Rejection failed"),
        )

    return {
        "rejected_count": result["rejected_count"],
        "message": result["message"],
    }
