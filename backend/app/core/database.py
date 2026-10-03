"""
MongoDB connection management using Motor async driver.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings
from typing import Optional
import structlog

logger = structlog.get_logger()

_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


async def connect_db() -> None:
    """Initialize MongoDB connection and create indexes."""
    global _client, _database
    settings = get_settings()

    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _database = _client[settings.mongodb_database]

    # Create required indexes
    await _create_indexes()
    logger.info("mongodb_connected", database=settings.mongodb_database)


async def _create_indexes() -> None:
    """Create application indexes for performance and uniqueness."""
    db = get_database()

    # Users: unique email
    await db.users.create_index("email_normalized", unique=True)

    # Notes: user-scoped listing by created_at
    await db.notes.create_index([("user_id", 1), ("created_at", -1)])

    # Notes: text search fallback
    await db.notes.create_index([("title", "text"), ("body", "text")])

    # Note chunks: user-scoped retrieval
    await db.note_chunks.create_index([("user_id", 1), ("note_id", 1)])

    # Notes: inbox metadata filtering
    await db.notes.create_index([("user_id", 1), ("inbox_metadata.processing_status", 1)])

    # Tasks: user-scoped listing by status and due date
    await db.tasks.create_index([("user_id", 1), ("status", 1), ("due_date", 1)])
    await db.tasks.create_index([("user_id", 1), ("created_at", -1)])

    # Tasks: idempotent suggestion acceptance with partial filter expression
    try:
        await db.tasks.drop_index("user_id_1_source_note_id_1_source_item_index_1")
    except Exception:
        pass

    await db.tasks.create_index(
        [("user_id", 1), ("source_note_id", 1), ("source_item_index", 1)],
        unique=True,
        partialFilterExpression={
            "source_note_id": {"$type": "objectId"},
            "source_item_index": {"$type": "number"},
        },
    )

    # Refresh tokens
    await db.refresh_tokens.create_index("token_hash", unique=True)
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)

    logger.info("mongodb_indexes_created")


async def close_db() -> None:
    """Close MongoDB connection."""
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("mongodb_disconnected")


def get_database() -> AsyncIOMotorDatabase:
    """Get the database instance. Raises if not connected."""
    global _client, _database
    if _database is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    try:
        import asyncio
        loop = asyncio.get_running_loop()
        if _client is not None and _client.get_io_loop() != loop:
            settings = get_settings()
            _client = AsyncIOMotorClient(settings.mongodb_uri)
            _database = _client[settings.mongodb_database]
    except RuntimeError:
        pass
    return _database


def get_client() -> AsyncIOMotorClient:
    """Get the client instance for health checks."""
    global _client, _database
    if _client is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    try:
        import asyncio
        loop = asyncio.get_running_loop()
        if _client.get_io_loop() != loop:
            settings = get_settings()
            _client = AsyncIOMotorClient(settings.mongodb_uri)
            _database = _client[settings.mongodb_database]
    except RuntimeError:
        pass
    return _client
