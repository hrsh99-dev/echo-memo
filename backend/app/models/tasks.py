"""
Pydantic schemas for Task Manager endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ===== Request schemas =====

class CreateTaskRequest(BaseModel):
    """Create a new task manually."""
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(default=None, max_length=5000)
    due_date: Optional[str] = Field(default=None, description="ISO date string")
    priority: TaskPriority = TaskPriority.MEDIUM
    tags: List[str] = Field(default_factory=list, max_length=20)
    category: Optional[str] = Field(default=None, max_length=50)
    source_note_id: Optional[str] = Field(default=None, description="Link to originating note")


class UpdateTaskRequest(BaseModel):
    """Update an existing task."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=5000)
    due_date: Optional[str] = Field(None, description="ISO date string or empty string to clear")
    priority: Optional[TaskPriority] = None
    tags: Optional[List[str]] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=50)


# ===== Response schemas =====

class TaskResponse(BaseModel):
    """Single task response."""
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None
    source_note_id: Optional[str] = None
    source_note_title: Optional[str] = None
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None


class TaskListResponse(BaseModel):
    """Paginated task list."""
    tasks: List[TaskResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class TaskStatsResponse(BaseModel):
    """Task dashboard statistics."""
    total_active: int = 0
    due_today: int = 0
    overdue: int = 0
    completed: int = 0
