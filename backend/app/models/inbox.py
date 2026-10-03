"""
Pydantic schemas for Smart Inbox endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class InboxCategory(str, Enum):
    TASK = "task"
    IDEA = "idea"
    REMINDER = "reminder"
    JOURNAL = "journal"
    MEETING = "meeting"
    REFERENCE = "reference"


class InboxProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    DISMISSED = "dismissed"


class ExtractedItemStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class ExtractedItem(BaseModel):
    """A single actionable item extracted from a note by AI."""
    type: str = Field(..., description="task, idea, reminder, etc.")
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(default=None, max_length=2000)
    due_date: Optional[str] = Field(default=None, description="ISO date string or null")
    priority: str = Field(default="medium", description="low, medium, high")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    date_ambiguous: bool = Field(default=False, description="True if the date was inferred from relative terms")
    status: str = Field(default="pending", description="pending, accepted, rejected")


class InboxMetadata(BaseModel):
    """AI-generated metadata attached to a note."""
    ai_title: Optional[str] = None
    summary: Optional[str] = None
    classification: Optional[str] = None
    suggested_tags: List[str] = Field(default_factory=list)
    extracted_items: List[ExtractedItem] = Field(default_factory=list)
    processing_status: str = InboxProcessingStatus.PENDING
    review_status: str = ReviewStatus.PENDING
    processed_at: Optional[str] = None
    error_message: Optional[str] = None


# ===== Request schemas =====

class ProcessNoteRequest(BaseModel):
    """Trigger AI processing for a note."""
    force: bool = Field(default=False, description="Re-process even if already completed")


class AcceptItemsRequest(BaseModel):
    """Accept specific extracted items from AI suggestions."""
    item_indices: List[int] = Field(..., min_length=1, description="Indices of items to accept")
    edits: Optional[dict] = Field(default=None, description="Optional edits keyed by item index")


class RejectItemsRequest(BaseModel):
    """Reject specific extracted items."""
    item_indices: List[int] = Field(..., min_length=1, description="Indices of items to reject")


# ===== Response schemas =====

class InboxItemResponse(BaseModel):
    """A note with its inbox metadata."""
    id: str
    title: str
    body: str
    capture_type: str
    tags: List[str] = []
    created_at: str
    updated_at: str
    has_audio: bool = False
    inbox_metadata: Optional[InboxMetadata] = None


class InboxListResponse(BaseModel):
    """Paginated inbox item list."""
    items: List[InboxItemResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class ProcessingResultResponse(BaseModel):
    """Result of AI processing."""
    note_id: str
    processing_status: str
    metadata: Optional[InboxMetadata] = None
    message: str


class AcceptResultResponse(BaseModel):
    """Result of accepting suggestions."""
    accepted_count: int
    tasks_created: List[str] = Field(default_factory=list, description="IDs of created tasks")
    message: str
