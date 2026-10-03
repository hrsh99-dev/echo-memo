"""
End-to-End integration test: Note creation -> Inbox processing -> Suggestion acceptance -> Task management.
"""

import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.asyncio
async def test_full_inbox_to_task_lifecycle(client, db):
    """
    Test complete lifecycle:
    1. Create note
    2. Inbox lists note
    3. Trigger AI processing
    4. Accept suggestion to create task
    5. List tasks and verify source link
    6. Complete task
    7. Check task stats
    """
    # 1. Create note via notes endpoint
    note_payload = {
        "title": "Strategy meeting action items",
        "body": "Need to send the updated roadmap document by Friday. Also organize client lunch next week.",
        "capture_type": "text",
        "tags": ["strategy", "roadmap"],
    }
    create_note_res = await client.post("/api/v1/notes", json=note_payload)
    assert create_note_res.status_code == 201
    note_id = create_note_res.json()["id"]

    # 2. Check note is listed in inbox
    inbox_res = await client.get("/api/v1/inbox")
    assert inbox_res.status_code == 200
    assert any(item["id"] == note_id for item in inbox_res.json()["items"])

    # 3. Trigger processing with mock AI output
    mock_ai_json = '''{
        "ai_title": "Roadmap & Client Lunch Planning",
        "summary": "Send updated roadmap by Friday and arrange client lunch.",
        "classification": "task",
        "suggested_tags": ["strategy", "planning"],
        "extracted_items": [
            {
                "type": "task",
                "title": "Send updated roadmap document",
                "description": "Send to team by Friday",
                "due_date": "2026-10-09",
                "priority": "high",
                "confidence": 0.95,
                "date_ambiguous": false
            }
        ]
    }'''

    mock_resp = MagicMock()
    mock_resp.text = mock_ai_json
    mock_gen = MagicMock()
    mock_gen.generate_content.return_value = mock_resp

    with patch("google.generativeai.GenerativeModel", return_value=mock_gen):
        with patch("app.core.config.Settings.gemini_configured", True):
            proc_res = await client.post(f"/api/v1/inbox/{note_id}/process", json={"force": True})
            assert proc_res.status_code == 200
            assert proc_res.json()["processing_status"] == "completed"

    # 4. Accept the suggested task
    accept_res = await client.post(
        f"/api/v1/inbox/{note_id}/accept",
        json={"item_indices": [0]},
    )
    assert accept_res.status_code == 200
    accept_data = accept_res.json()
    assert accept_data["accepted_count"] == 1
    task_id = accept_data["tasks_created"][0]

    # 5. Verify task is listed in tasks view
    tasks_res = await client.get("/api/v1/tasks")
    assert tasks_res.status_code == 200
    tasks = tasks_res.json()["tasks"]
    task = next((t for t in tasks if t["id"] == task_id), None)
    assert task is not None
    assert task["title"] == "Send updated roadmap document"
    assert task["priority"] == "high"
    assert task["source_note_id"] == note_id
    assert task["status"] == "pending"

    # 6. Complete task
    comp_res = await client.post(f"/api/v1/tasks/{task_id}/complete")
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"

    # 7. Check stats dashboard reflects completed task
    stats_res = await client.get("/api/v1/tasks/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["completed"] >= 1
