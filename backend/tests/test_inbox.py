"""
Tests for Smart Inbox: AI processing, suggestion review, acceptance/rejection, and filtering.
"""

import pytest
from unittest.mock import patch, MagicMock
from bson import ObjectId
from app.services import inbox_service
from app.models.inbox import InboxProcessingStatus, ExtractedItemStatus, ReviewStatus


@pytest.fixture
def sample_note(test_user):
    """Generate a sample note document."""
    return {
        "_id": ObjectId(),
        "user_id": test_user["_id"],
        "title": "Voice Note Oct 2",
        "body": "Remember to call Sarah tomorrow at 3pm to review the quarterly budget presentation.",
        "capture_type": "voice",
        "tags": ["quick-thought"],
        "created_at": "2026-10-02T10:00:00Z",
        "updated_at": "2026-10-02T10:00:00Z",
        "has_audio": False,
        "processing_status": "completed",
    }


def test_parse_ai_response():
    """Test AI response parser handling both clean JSON and code-fenced JSON."""
    clean_json = '''{
        "ai_title": "Quarterly Budget Review Call",
        "summary": "Call Sarah tomorrow to review budget.",
        "classification": "task",
        "suggested_tags": ["budget", "finance"],
        "extracted_items": [
            {
                "type": "task",
                "title": "Call Sarah about budget",
                "description": "Quarterly presentation",
                "due_date": "2026-10-03",
                "priority": "high",
                "confidence": 0.95,
                "date_ambiguous": true
            }
        ]
    }'''
    parsed = inbox_service._parse_ai_response(clean_json)
    assert parsed is not None
    assert parsed["ai_title"] == "Quarterly Budget Review Call"
    assert parsed["classification"] == "task"
    assert len(parsed["extracted_items"]) == 1
    assert parsed["extracted_items"][0]["title"] == "Call Sarah about budget"
    assert parsed["extracted_items"][0]["confidence"] == 0.95

    # Markdown fence wrapped
    fenced_json = f"```json\n{clean_json}\n```"
    parsed_fenced = inbox_service._parse_ai_response(fenced_json)
    assert parsed_fenced is not None
    assert parsed_fenced["classification"] == "task"

    # Malformed JSON
    assert inbox_service._parse_ai_response("Invalid non-json string") is None


@pytest.mark.asyncio
async def test_list_and_get_inbox_items(client, db, test_user, sample_note):
    """Test listing notes in inbox and retrieving a single note."""
    sample_note["inbox_metadata"] = {
        "ai_title": "AI Clean Title",
        "summary": "Summary here",
        "classification": "reminder",
        "suggested_tags": ["planning"],
        "extracted_items": [],
        "processing_status": "completed",
        "review_status": "pending",
        "processed_at": "2026-10-02T10:05:00Z",
        "error_message": None,
    }
    await db.notes.insert_one(sample_note)
    note_id = str(sample_note["_id"])

    # List all
    res = await client.get("/api/v1/inbox")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any(item["id"] == note_id for item in data["items"])

    # Filter by category
    res_cat = await client.get("/api/v1/inbox?category=reminder")
    assert res_cat.status_code == 200
    assert any(item["id"] == note_id for item in res_cat.json()["items"])

    # Get single item
    get_res = await client.get(f"/api/v1/inbox/{note_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == note_id
    assert get_res.json()["inbox_metadata"]["classification"] == "reminder"


@pytest.mark.asyncio
async def test_process_note_with_ai_mock(client, db, test_user, sample_note):
    """Test triggering AI processing on a note with mocked Gemini."""
    await db.notes.insert_one(sample_note)
    note_id = str(sample_note["_id"])

    mock_ai_json = '''{
        "ai_title": "Call Sarah for Budget",
        "summary": "Discuss quarterly budget.",
        "classification": "meeting",
        "suggested_tags": ["budget"],
        "extracted_items": [
            {
                "type": "task",
                "title": "Call Sarah",
                "due_date": "2026-10-03",
                "priority": "high",
                "confidence": 0.9,
                "date_ambiguous": true
            }
        ]
    }'''

    mock_response = MagicMock()
    mock_response.text = mock_ai_json
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response

    with patch("google.generativeai.GenerativeModel", return_value=mock_model):
        with patch("app.core.config.Settings.gemini_configured", True):
            res = await client.post(f"/api/v1/inbox/{note_id}/process", json={"force": True})
            assert res.status_code == 200
            data = res.json()
            assert data["processing_status"] == "completed"
            assert data["metadata"]["ai_title"] == "Call Sarah for Budget"
            assert len(data["metadata"]["extracted_items"]) == 1


@pytest.mark.asyncio
async def test_accept_and_reject_suggestions(client, db, test_user, sample_note):
    """Test accepting and rejecting suggestions to create tasks and update review status."""
    sample_note["inbox_metadata"] = {
        "ai_title": "Meeting Follow-up",
        "summary": "Review budget and slides",
        "classification": "task",
        "suggested_tags": ["work"],
        "extracted_items": [
            {
                "type": "task",
                "title": "Prepare slides",
                "description": "5 slides for marketing",
                "due_date": "2026-10-05",
                "priority": "medium",
                "confidence": 0.88,
                "date_ambiguous": False,
                "status": "pending",
            },
            {
                "type": "idea",
                "title": "Consider switching vendor",
                "description": None,
                "due_date": None,
                "priority": "low",
                "confidence": 0.6,
                "date_ambiguous": False,
                "status": "pending",
            },
        ],
        "processing_status": "completed",
        "review_status": "pending",
        "processed_at": "2026-10-02T10:00:00Z",
    }
    await db.notes.insert_one(sample_note)
    note_id = str(sample_note["_id"])

    # 1. Accept first item (index 0) with custom edit
    accept_payload = {
        "item_indices": [0],
        "edits": {
            "0": {
                "title": "Prepare marketing slides",
                "priority": "high",
            }
        },
    }
    accept_res = await client.post(f"/api/v1/inbox/{note_id}/accept", json=accept_payload)
    assert accept_res.status_code == 200
    accept_data = accept_res.json()
    assert accept_data["accepted_count"] == 1
    assert len(accept_data["tasks_created"]) == 1
    created_task_id = accept_data["tasks_created"][0]

    # Verify task was created in tasks collection with edits applied
    task_res = await client.get(f"/api/v1/tasks/{created_task_id}")
    assert task_res.status_code == 200
    task_data = task_res.json()
    assert task_data["title"] == "Prepare marketing slides"
    assert task_data["priority"] == "high"
    assert task_data["source_note_id"] == note_id

    # 2. Reject second item (index 1)
    reject_res = await client.post(f"/api/v1/inbox/{note_id}/reject", json={"item_indices": [1]})
    assert reject_res.status_code == 200

    # 3. Check note inbox metadata reflects reviewed state
    updated_note_res = await client.get(f"/api/v1/inbox/{note_id}")
    meta = updated_note_res.json()["inbox_metadata"]
    assert meta["review_status"] == "reviewed"
    assert meta["extracted_items"][0]["status"] == "accepted"
    assert meta["extracted_items"][1]["status"] == "rejected"
