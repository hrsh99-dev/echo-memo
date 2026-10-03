"""
Embedding service: generate embeddings and manage vector chunks using Google Gemini.
"""

import asyncio
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from app.core.config import get_settings
from app.core.database import get_database
import google.generativeai as genai
import structlog

logger = structlog.get_logger()

_configured = False


def _ensure_configured():
    """Configure the Gemini SDK if not already done."""
    global _configured
    if not _configured:
        settings = get_settings()
        if settings.gemini_configured:
            genai.configure(api_key=settings.gemini_api_key)
            _configured = True
        else:
            raise RuntimeError("Gemini API not configured")


async def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate an embedding vector for the given text using Gemini."""
    settings = get_settings()
    if not settings.gemini_configured:
        logger.warning("embedding_skipped", reason="gemini_not_configured")
        return None

    try:
        _ensure_configured()
        result = genai.embed_content(
            model=settings.embedding_model,
            content=text,
            task_type="retrieval_document",
        )
        return result["embedding"]
    except Exception as e:
        logger.error("embedding_failed", error=str(e))
        return None


async def generate_query_embedding(text: str) -> Optional[List[float]]:
    """Generate an embedding vector for a search query."""
    settings = get_settings()
    if not settings.gemini_configured:
        return None

    try:
        _ensure_configured()
        result = genai.embed_content(
            model=settings.embedding_model,
            content=text,
            task_type="retrieval_query",
        )
        return result["embedding"]
    except Exception as e:
        logger.error("query_embedding_failed", error=str(e))
        return None


async def create_note_chunks(note_id: str, user_id: str, title: str, body: str) -> bool:
    """
    Create embedding chunks for a note.
    For MVP, we create one chunk per note (title + body combined).
    """
    db = get_database()

    # Delete existing chunks for this note
    await db.note_chunks.delete_many({
        "note_id": ObjectId(note_id),
        "user_id": ObjectId(user_id),
    })

    # Generate embedding for the full note
    combined_text = f"{title}\n\n{body}"
    embedding = await generate_embedding(combined_text)

    if embedding is None:
        logger.warning("chunk_creation_skipped", note_id=note_id, reason="no_embedding")
        return False

    chunk_doc = {
        "note_id": ObjectId(note_id),
        "user_id": ObjectId(user_id),
        "text": combined_text[:2000],  # Store truncated text for context
        "embedding": embedding,
        "chunk_index": 0,
        "created_at": datetime.now(timezone.utc),
    }

    await db.note_chunks.insert_one(chunk_doc)
    logger.info("note_chunks_created", note_id=note_id, chunks=1)
    return True


async def semantic_search(
    user_id: str,
    query: str,
    limit: int = 5,
    score_threshold: float = 0.5,
) -> List[dict]:
    """
    Perform semantic search over user's note chunks using MongoDB Atlas Vector Search.
    Falls back to text search if vector search is unavailable.
    """
    db = get_database()
    settings = get_settings()

    if not settings.gemini_configured:
        return await _keyword_fallback(user_id, query, limit)

    query_embedding = await generate_query_embedding(query)
    if query_embedding is None:
        return await _keyword_fallback(user_id, query, limit)

    try:
        # MongoDB Atlas Vector Search aggregation
        pipeline = [
            {
                "$vectorSearch": {
                    "index": settings.vector_search_index,
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": limit * 10,
                    "limit": limit,
                    "filter": {
                        "user_id": ObjectId(user_id),
                    },
                }
            },
            {
                "$addFields": {
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
            {
                "$match": {
                    "score": {"$gte": score_threshold},
                }
            },
            {
                "$lookup": {
                    "from": "notes",
                    "localField": "note_id",
                    "foreignField": "_id",
                    "as": "note",
                }
            },
            {
                "$unwind": "$note",
            },
            {
                "$project": {
                    "note_id": {"$toString": "$note_id"},
                    "title": "$note.title",
                    "excerpt": "$text",
                    "score": 1,
                    "user_id": 1,
                }
            },
        ]

        cursor = db.note_chunks.aggregate(pipeline)
        results = await asyncio.wait_for(cursor.to_list(length=limit), timeout=2.5)

        # Verify ownership (defense in depth)
        verified_results = [
            r for r in results
            if str(r.get("user_id")) == user_id or r.get("user_id") == ObjectId(user_id)
        ]

        if verified_results:
            return verified_results

        # If Atlas vector index returned 0 results, fall back to in-memory cosine similarity
        return await _cosine_search(user_id, query, query_embedding, limit, score_threshold)

    except Exception as e:
        logger.warning("vector_search_atlas_index_unavailable_fallback_to_cosine", error=str(e))
        return await _cosine_search(user_id, query, query_embedding, limit, score_threshold)


async def _cosine_search(
    user_id: str,
    query: str,
    query_embedding: List[float],
    limit: int,
    score_threshold: float,
) -> List[dict]:
    """In-memory cosine similarity across user note chunks."""
    db = get_database()
    try:
        chunks_cursor = db.note_chunks.find({"user_id": ObjectId(user_id)})
        chunks = await chunks_cursor.to_list(length=300)
        if chunks and query_embedding:
            scored = []
            for chunk in chunks:
                emb = chunk.get("embedding")
                if emb and len(emb) == len(query_embedding):
                    dot = sum(a * b for a, b in zip(query_embedding, emb))
                    norm1 = sum(a * a for a in query_embedding) ** 0.5
                    norm2 = sum(b * b for b in emb) ** 0.5
                    sim = dot / (norm1 * norm2) if (norm1 > 0 and norm2 > 0) else 0.0
                    if sim >= score_threshold:
                        scored.append((sim, chunk))
            scored.sort(key=lambda x: x[0], reverse=True)
            top = scored[:limit]

            results = []
            for score, chunk in top:
                note = await db.notes.find_one({"_id": chunk["note_id"]})
                if note:
                    results.append({
                        "note_id": str(chunk["note_id"]),
                        "title": note.get("title", ""),
                        "excerpt": chunk.get("text", ""),
                        "score": float(score),
                        "user_id": user_id,
                    })
            if results:
                return results
    except Exception as local_err:
        logger.error("local_cosine_similarity_failed", error=str(local_err))

    return await _keyword_fallback(user_id, query, limit)


async def _keyword_fallback(user_id: str, query: str, limit: int) -> List[dict]:
    """Keyword search fallback when vector search is unavailable."""
    db = get_database()

    try:
        cursor = db.notes.find(
            {
                "user_id": ObjectId(user_id),
                "$text": {"$search": query},
            },
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)

        results = await cursor.to_list(length=limit)

        return [
            {
                "note_id": str(r["_id"]),
                "title": r.get("title", ""),
                "excerpt": r.get("body", "")[:300],
                "score": r.get("score", 0.0),
            }
            for r in results
        ]
    except Exception as e:
        logger.error("keyword_search_failed", error=str(e))
        return []
