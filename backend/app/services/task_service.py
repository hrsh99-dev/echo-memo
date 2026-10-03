"""
Task service: CRUD operations for tasks with ownership enforcement.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Union
from bson import ObjectId
from app.core.database import get_database
import structlog

logger = structlog.get_logger()


async def create_task(
    user_id: str,
    title: str,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: str = "medium",
    tags: List[str] = None,
    category: Optional[str] = None,
    source_note_id: Optional[str] = None,
) -> dict:
    """Create a new task for the given user."""
    db = get_database()
    now = datetime.now(timezone.utc)

    parsed_due_date = _parse_due_date(due_date)

    task_doc = {
        "user_id": ObjectId(user_id),
        "title": title.strip()[:300],
        "description": description.strip()[:5000] if description else None,
        "status": "pending",
        "priority": priority if priority in ("low", "medium", "high") else "medium",
        "due_date": parsed_due_date,
        "tags": [t.strip().lower() for t in (tags or []) if t.strip()][:20],
        "category": category.strip().lower() if category else None,
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }

    if source_note_id:
        task_doc["source_note_id"] = ObjectId(source_note_id)
        task_doc["source_item_index"] = None

    result = await db.tasks.insert_one(task_doc)
    task_doc["_id"] = result.inserted_id

    logger.info("task_created", task_id=str(result.inserted_id), user_id=user_id)
    return task_doc


async def create_task_from_suggestion(
    user_id: str,
    source_note_id: str,
    source_item_index: int,
    item: dict,
) -> Optional[str]:
    """
    Create a task from an inbox suggestion. Idempotent — won't create
    a duplicate if a task already exists for this note+item combination.
    Returns the task ID or None if duplicate.
    """
    db = get_database()

    # Check for existing task from same source
    existing = await db.tasks.find_one({
        "user_id": ObjectId(user_id),
        "source_note_id": ObjectId(source_note_id),
        "source_item_index": source_item_index,
    })

    if existing:
        logger.info("task_duplicate_skipped", note_id=source_note_id, item_index=source_item_index)
        return str(existing["_id"])

    now = datetime.now(timezone.utc)
    parsed_due_date = _parse_due_date(item.get("due_date"))

    task_doc = {
        "user_id": ObjectId(user_id),
        "title": item.get("title", "Untitled Task").strip()[:300],
        "description": item.get("description"),
        "status": "pending",
        "priority": item.get("priority", "medium"),
        "due_date": parsed_due_date,
        "tags": [],
        "category": item.get("type", "task"),
        "source_note_id": ObjectId(source_note_id),
        "source_item_index": source_item_index,
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }

    result = await db.tasks.insert_one(task_doc)
    logger.info("task_created_from_suggestion", task_id=str(result.inserted_id), note_id=source_note_id)
    return str(result.inserted_id)


async def get_task(task_id: str, user_id: str) -> Optional[dict]:
    """Get a task by ID, enforcing user ownership."""
    db = get_database()
    try:
        task = await db.tasks.find_one({
            "_id": ObjectId(task_id),
            "user_id": ObjectId(user_id),
        })
        return task
    except Exception:
        return None


def _due_date_condition(view: str, today_start: datetime, today_end: datetime) -> dict:
    """
    Build a MongoDB filter that matches either BSON Date or ISO String due dates.
    Ensures query compatibility regardless of how dates were ingested.
    """
    iso_start = today_start.isoformat()
    iso_end = today_end.isoformat()
    day_str = today_start.strftime("%Y-%m-%d")
    next_day_str = today_end.strftime("%Y-%m-%d")

    if view == "today":
        return {
            "$or": [
                {"due_date": {"$gte": today_start, "$lt": today_end}},
                {"due_date": {"$gte": iso_start, "$lt": iso_end}},
                {"due_date": {"$regex": f"^{day_str}"}},
            ]
        }
    elif view == "upcoming":
        return {
            "$or": [
                {"due_date": {"$gte": today_end}},
                {"due_date": {"$gte": iso_end}},
                {"due_date": {"$gte": next_day_str}},
            ]
        }
    elif view == "overdue":
        return {
            "$or": [
                {"due_date": {"$lt": today_start, "$ne": None, "$type": "date"}},
                {"due_date": {"$lt": iso_start, "$ne": None, "$type": "string"}},
                {"due_date": {"$lt": day_str, "$ne": None, "$type": "string"}},
            ]
        }
    return {}


async def list_tasks(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    view: Optional[str] = None,
    search_query: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple:
    """List tasks for a user with filters, pagination, and sorting."""
    db = get_database()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    query = {"user_id": ObjectId(user_id)}

    if status:
        query["status"] = status

    if priority:
        query["priority"] = priority

    and_clauses = []

    # View-based filters
    if view in ("today", "upcoming", "overdue"):
        query["status"] = "pending"
        and_clauses.append(_due_date_condition(view, today_start, today_end))
    elif view == "completed":
        query["status"] = "completed"

    if search_query:
        # Use regex for simple search on title and description
        and_clauses.append({
            "$or": [
                {"title": {"$regex": search_query, "$options": "i"}},
                {"description": {"$regex": search_query, "$options": "i"}},
            ]
        })

    if and_clauses:
        query["$and"] = and_clauses

    total = await db.tasks.count_documents(query)
    skip = (page - 1) * page_size

    # Sorting
    sort_field = sort_by if sort_by in ("created_at", "due_date", "priority", "updated_at") else "created_at"
    sort_dir = 1 if sort_order == "asc" else -1

    # Priority sorting needs special handling
    if sort_field == "priority":
        # Use aggregation for custom sort order
        pipeline = [
            {"$match": query},
            {"$addFields": {
                "priority_order": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$priority", "high"]}, "then": 0},
                            {"case": {"$eq": ["$priority", "medium"]}, "then": 1},
                            {"case": {"$eq": ["$priority", "low"]}, "then": 2},
                        ],
                        "default": 1,
                    }
                }
            }},
            {"$sort": {"priority_order": sort_dir, "created_at": -1}},
            {"$skip": skip},
            {"$limit": page_size},
        ]
        cursor = db.tasks.aggregate(pipeline)
        tasks = await cursor.to_list(length=page_size)
    else:
        cursor = db.tasks.find(query).sort(sort_field, sort_dir).skip(skip).limit(page_size)
        tasks = await cursor.to_list(length=page_size)

    return tasks, total


async def update_task(
    task_id: str,
    user_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: Optional[str] = None,
    tags: Optional[List[str]] = None,
    category: Optional[str] = None,
) -> Optional[dict]:
    """Update a task, enforcing user ownership."""
    db = get_database()

    update_fields = {"updated_at": datetime.now(timezone.utc)}

    if title is not None:
        update_fields["title"] = title.strip()[:300]
    if description is not None:
        update_fields["description"] = description.strip()[:5000] if description else None
    if due_date is not None:
        if due_date == "" or due_date == "null":
            update_fields["due_date"] = None
        else:
            update_fields["due_date"] = _parse_due_date(due_date)
    if priority is not None and priority in ("low", "medium", "high"):
        update_fields["priority"] = priority
    if tags is not None:
        update_fields["tags"] = [t.strip().lower() for t in tags if t.strip()][:20]
    if category is not None:
        update_fields["category"] = category.strip().lower() if category else None

    result = await db.tasks.find_one_and_update(
        {"_id": ObjectId(task_id), "user_id": ObjectId(user_id)},
        {"$set": update_fields},
        return_document=True,
    )

    if result:
        logger.info("task_updated", task_id=task_id, user_id=user_id)

    return result


async def complete_task(task_id: str, user_id: str) -> Optional[dict]:
    """Mark a task as completed."""
    db = get_database()
    now = datetime.now(timezone.utc)

    result = await db.tasks.find_one_and_update(
        {"_id": ObjectId(task_id), "user_id": ObjectId(user_id)},
        {"$set": {
            "status": "completed",
            "completed_at": now,
            "updated_at": now,
        }},
        return_document=True,
    )

    if result:
        logger.info("task_completed", task_id=task_id, user_id=user_id)

    return result


async def reopen_task(task_id: str, user_id: str) -> Optional[dict]:
    """Reopen a completed task."""
    db = get_database()
    now = datetime.now(timezone.utc)

    result = await db.tasks.find_one_and_update(
        {"_id": ObjectId(task_id), "user_id": ObjectId(user_id)},
        {"$set": {
            "status": "pending",
            "completed_at": None,
            "updated_at": now,
        }},
        return_document=True,
    )

    if result:
        logger.info("task_reopened", task_id=task_id, user_id=user_id)

    return result


async def delete_task(task_id: str, user_id: str) -> bool:
    """Delete a task, enforcing user ownership."""
    db = get_database()

    result = await db.tasks.delete_one({
        "_id": ObjectId(task_id),
        "user_id": ObjectId(user_id),
    })

    if result.deleted_count > 0:
        logger.info("task_deleted", task_id=task_id, user_id=user_id)
        return True

    return False


async def get_task_stats(user_id: str) -> dict:
    """Get task statistics for the dashboard."""
    db = get_database()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    uid = ObjectId(user_id)

    total_active = await db.tasks.count_documents({
        "user_id": uid,
        "status": "pending",
    })

    due_today_filter = {"user_id": uid, "status": "pending"}
    due_today_cond = _due_date_condition("today", today_start, today_end)
    if "$or" in due_today_cond:
        due_today_filter["$or"] = due_today_cond["$or"]
    due_today = await db.tasks.count_documents(due_today_filter)

    overdue_filter = {"user_id": uid, "status": "pending"}
    overdue_cond = _due_date_condition("overdue", today_start, today_end)
    if "$or" in overdue_cond:
        overdue_filter["$or"] = overdue_cond["$or"]
    overdue = await db.tasks.count_documents(overdue_filter)

    completed = await db.tasks.count_documents({
        "user_id": uid,
        "status": "completed",
    })

    return {
        "total_active": total_active,
        "due_today": due_today,
        "overdue": overdue,
        "completed": completed,
    }


def _parse_due_date(due_date: Optional[Union[str, datetime]]) -> Optional[datetime]:
    """Parse a date string or datetime into a UTC datetime object."""
    if not due_date:
        return None
    if isinstance(due_date, datetime):
        return due_date if due_date.tzinfo else due_date.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        try:
            return datetime.strptime(due_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            return None


async def format_task_response(task: dict) -> dict:
    """Format a MongoDB task document to an API response."""
    db = get_database()

    source_note_title = None
    source_note_id = task.get("source_note_id")
    if source_note_id:
        note = await db.notes.find_one(
            {"_id": source_note_id},
            {"title": 1},
        )
        if note:
            source_note_title = note.get("title", "")

    return {
        "id": str(task["_id"]),
        "title": task.get("title", ""),
        "description": task.get("description"),
        "status": task.get("status", "pending"),
        "priority": task.get("priority", "medium"),
        "due_date": task["due_date"].isoformat() if isinstance(task.get("due_date"), datetime) else task.get("due_date"),
        "tags": task.get("tags", []),
        "category": task.get("category"),
        "source_note_id": str(source_note_id) if source_note_id else None,
        "source_note_title": source_note_title,
        "created_at": task["created_at"].isoformat() if isinstance(task.get("created_at"), datetime) else str(task.get("created_at", "")),
        "updated_at": task["updated_at"].isoformat() if isinstance(task.get("updated_at"), datetime) else str(task.get("updated_at", "")),
        "completed_at": task["completed_at"].isoformat() if isinstance(task.get("completed_at"), datetime) else task.get("completed_at"),
    }
