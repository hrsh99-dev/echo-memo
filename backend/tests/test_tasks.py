"""
Tests for Task Manager: CRUD, filters, stats, views, and suggestion idempotency.
"""

import pytest
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.services import task_service


@pytest.mark.asyncio
async def test_create_and_get_task(client, db):
    """Test creating a manual task and retrieving it by ID."""
    payload = {
        "title": "Complete Hacktoberfest PR",
        "description": "Finalize EchoMemo smart inbox and task manager",
        "due_date": "2026-10-15T18:00:00Z",
        "priority": "high",
        "tags": ["hacktoberfest", "feature"],
        "category": "work",
    }
    response = await client.post("/api/v1/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert "hacktoberfest" in data["tags"]
    task_id = data["id"]

    # Get single task
    get_res = await client.get(f"/api/v1/tasks/{task_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == task_id
    assert get_res.json()["title"] == payload["title"]


@pytest.mark.asyncio
async def test_update_task(client, db):
    """Test updating task fields via PATCH."""
    create_res = await client.post("/api/v1/tasks", json={"title": "Original Title"})
    assert create_res.status_code == 201
    task_id = create_res.json()["id"]

    patch_payload = {
        "title": "Updated Title",
        "priority": "low",
        "tags": ["updated"],
    }
    update_res = await client.patch(f"/api/v1/tasks/{task_id}", json=patch_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["title"] == "Updated Title"
    assert updated["priority"] == "low"
    assert "updated" in updated["tags"]


@pytest.mark.asyncio
async def test_complete_and_reopen_task(client, db):
    """Test toggling task completion status."""
    create_res = await client.post("/api/v1/tasks", json={"title": "Task to complete"})
    task_id = create_res.json()["id"]

    # Mark complete
    comp_res = await client.post(f"/api/v1/tasks/{task_id}/complete")
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"
    assert comp_res.json()["completed_at"] is not None

    # Reopen
    reopen_res = await client.post(f"/api/v1/tasks/{task_id}/reopen")
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "pending"
    assert reopen_res.json()["completed_at"] is None


@pytest.mark.asyncio
async def test_delete_task(client, db):
    """Test deleting a task."""
    create_res = await client.post("/api/v1/tasks", json={"title": "To be deleted"})
    task_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/tasks/{task_id}")
    assert del_res.status_code == 204

    # Ensure 404 when retrieving deleted task
    get_res = await client.get(f"/api/v1/tasks/{task_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_list_tasks_and_filters(client, db):
    """Test filtering tasks by status, priority, and views."""
    now = datetime.now(timezone.utc)
    today_iso = now.strftime("%Y-%m-%d")
    tomorrow_iso = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_iso = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    # Create various tasks
    t1 = await client.post("/api/v1/tasks", json={"title": "Task Overdue", "due_date": yesterday_iso, "priority": "high"})
    t2 = await client.post("/api/v1/tasks", json={"title": "Task Today", "due_date": today_iso, "priority": "medium"})
    t3 = await client.post("/api/v1/tasks", json={"title": "Task Future", "due_date": tomorrow_iso, "priority": "low"})
    assert t1.status_code == 201 and t2.status_code == 201 and t3.status_code == 201

    # Filter by priority
    res_high = await client.get("/api/v1/tasks?priority=high")
    assert res_high.status_code == 200
    assert any(t["title"] == "Task Overdue" for t in res_high.json()["tasks"])
    assert not any(t["title"] == "Task Future" for t in res_high.json()["tasks"])

    # Filter by view: overdue
    res_overdue = await client.get("/api/v1/tasks?view=overdue")
    assert res_overdue.status_code == 200
    assert any(t["title"] == "Task Overdue" for t in res_overdue.json()["tasks"])

    # Filter by view: today
    res_today = await client.get("/api/v1/tasks?view=today")
    assert res_today.status_code == 200
    assert any(t["title"] == "Task Today" for t in res_today.json()["tasks"])

    # Filter by view: upcoming
    res_upcoming = await client.get("/api/v1/tasks?view=upcoming")
    assert res_upcoming.status_code == 200
    assert any(t["title"] == "Task Future" for t in res_upcoming.json()["tasks"])


@pytest.mark.asyncio
async def test_task_stats(client, db):
    """Test task stats dashboard endpoint."""
    now = datetime.now(timezone.utc)
    today_iso = now.strftime("%Y-%m-%d")
    yesterday_iso = (now - timedelta(days=2)).strftime("%Y-%m-%d")

    await client.post("/api/v1/tasks", json={"title": "Stats Overdue", "due_date": yesterday_iso})
    await client.post("/api/v1/tasks", json={"title": "Stats Today", "due_date": today_iso})
    done_res = await client.post("/api/v1/tasks", json={"title": "Stats Done"})
    await client.post(f"/api/v1/tasks/{done_res.json()['id']}/complete")

    stats_res = await client.get("/api/v1/tasks/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_active"] >= 2
    assert stats["due_today"] >= 1
    assert stats["overdue"] >= 1
    assert stats["completed"] >= 1


@pytest.mark.asyncio
async def test_idempotent_task_creation_from_suggestion(test_user, db):
    """Test create_task_from_suggestion does not create duplicates for the same item."""
    user_id = str(test_user["_id"])
    note_id = str(ObjectId())

    item = {
        "title": "Buy groceries",
        "description": "Milk and bread",
        "due_date": "2026-10-10",
        "priority": "medium",
        "type": "task",
    }

    task_id_1 = await task_service.create_task_from_suggestion(
        user_id=user_id,
        source_note_id=note_id,
        source_item_index=0,
        item=item,
    )
    assert task_id_1 is not None

    # Call again with the exact same source note and item index
    task_id_2 = await task_service.create_task_from_suggestion(
        user_id=user_id,
        source_note_id=note_id,
        source_item_index=0,
        item=item,
    )
    assert task_id_1 == task_id_2

    # Verify only 1 document in DB
    count = await db.tasks.count_documents({
        "user_id": test_user["_id"],
        "source_note_id": ObjectId(note_id),
        "source_item_index": 0,
    })
    assert count == 1
