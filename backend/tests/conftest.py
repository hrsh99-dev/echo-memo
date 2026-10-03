"""
Pytest configuration and fixtures for EchoMemo backend tests.
"""

import pytest
import pytest_asyncio
from bson import ObjectId
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.core.database import connect_db, close_db, get_database
from app.core.security import get_current_user

app = create_app()

TEST_USER_ID = ObjectId()
TEST_USER = {
    "_id": TEST_USER_ID,
    "email": "testuser@echomemo.io",
    "name": "Test User",
    "password_hash": "hashed_pw",
    "created_at": "2026-10-01T00:00:00Z",
    "deletion_status": "none",
}


@pytest_asyncio.fixture(autouse=True)
async def init_test_db():
    """Initialize database connection per test function."""
    await connect_db()
    yield
    # Cleanup test user records
    try:
        db = get_database()
        await db.notes.delete_many({"user_id": TEST_USER_ID})
        await db.note_chunks.delete_many({"user_id": TEST_USER_ID})
        await db.tasks.delete_many({"user_id": TEST_USER_ID})
    except Exception:
        pass
    await close_db()


@pytest_asyncio.fixture
async def db():
    """Provides the database instance for direct database operations."""
    return get_database()


@pytest.fixture
def test_user():
    """Return test user dictionary."""
    return TEST_USER


@pytest.fixture
def auth_override():
    """Override get_current_user dependency to authenticate as test_user."""
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest_asyncio.fixture
async def client(auth_override):
    """Async HTTP test client with auth pre-configured."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def unauth_client():
    """Async HTTP test client without auth override."""
    app.dependency_overrides.pop(get_current_user, None)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
