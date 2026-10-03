"""
Tasks router: Task Manager CRUD and dashboard endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.security import get_current_user
from app.services import task_service
from app.models.tasks import (
    CreateTaskRequest,
    UpdateTaskRequest,
    TaskResponse,
    TaskListResponse,
    TaskStatsResponse,
)
from typing import Optional
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


@router.get("/stats", response_model=TaskStatsResponse)
async def get_task_stats(user: dict = Depends(get_current_user)):
    """Get task dashboard statistics."""
    user_id = str(user["_id"])
    stats = await task_service.get_task_stats(user_id)
    return TaskStatsResponse(**stats)


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    user: dict = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = Query(default=None),
    view: Optional[str] = Query(default=None, description="today, upcoming, overdue, completed"),
    q: Optional[str] = Query(default=None, max_length=500),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
):
    """List tasks with filters, pagination, and sorting."""
    user_id = str(user["_id"])

    tasks, total = await task_service.list_tasks(
        user_id=user_id,
        page=page,
        page_size=page_size,
        status=status_filter,
        priority=priority,
        view=view,
        search_query=q,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    formatted = []
    for t in tasks:
        formatted.append(await task_service.format_task_response(t))

    return TaskListResponse(
        tasks=formatted,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    request: CreateTaskRequest,
    user: dict = Depends(get_current_user),
):
    """Create a new task manually."""
    user_id = str(user["_id"])

    task = await task_service.create_task(
        user_id=user_id,
        title=request.title,
        description=request.description,
        due_date=request.due_date,
        priority=request.priority,
        tags=request.tags,
        category=request.category,
        source_note_id=request.source_note_id,
    )

    return await task_service.format_task_response(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single task by ID."""
    user_id = str(user["_id"])
    task = await task_service.get_task(task_id, user_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return await task_service.format_task_response(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    request: UpdateTaskRequest,
    user: dict = Depends(get_current_user),
):
    """Update a task's fields."""
    user_id = str(user["_id"])

    task = await task_service.update_task(
        task_id=task_id,
        user_id=user_id,
        title=request.title,
        description=request.description,
        due_date=request.due_date,
        priority=request.priority.value if request.priority else None,
        tags=request.tags,
        category=request.category,
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return await task_service.format_task_response(task)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    user: dict = Depends(get_current_user),
):
    """Mark a task as completed."""
    user_id = str(user["_id"])
    task = await task_service.complete_task(task_id, user_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return await task_service.format_task_response(task)


@router.post("/{task_id}/reopen", response_model=TaskResponse)
async def reopen_task(
    task_id: str,
    user: dict = Depends(get_current_user),
):
    """Reopen a completed task."""
    user_id = str(user["_id"])
    task = await task_service.reopen_task(task_id, user_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return await task_service.format_task_response(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a task."""
    user_id = str(user["_id"])
    deleted = await task_service.delete_task(task_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
