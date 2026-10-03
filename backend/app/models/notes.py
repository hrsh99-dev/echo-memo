"""
Pydantic schemas for notes endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class CaptureType(str, Enum):
    VOICE = "voice"
    TEXT = "text"


class ProcessingStatus(str, Enum):
    DRAFT = "draft"
    TRANSCRIBING = "transcribing"
    EMBEDDING = "embedding"
    READY = "ready"
    FAILED = "failed"


class CreateNoteRequest(BaseModel):
    """Create a new text note."""
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=50000)
    tags: List[str] = Field(default_factory=list, max_length=20)
    capture_type: CaptureType = CaptureType.TEXT


class UpdateNoteRequest(BaseModel):
    """Update an existing note."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    body: Optional[str] = Field(None, min_length=1, max_length=50000)
    tags: Optional[List[str]] = Field(None, max_length=20)


class NoteResponse(BaseModel):
    """Single note response."""
    id: str
    title: str
    body: str
    capture_type: str
    tags: List[str] = []
    processing_status: str = "ready"
    created_at: str
    updated_at: str
    has_audio: bool = False


class NoteListResponse(BaseModel):
    """Paginated note list response."""
    notes: List[NoteResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class SearchRequest(BaseModel):
    """Search notes request."""
    query: str = Field(..., min_length=1, max_length=500)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=50)
