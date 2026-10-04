"""
Embedding service: generate embeddings and manage vector chunks using Google Gemini.
"""

import asyncio
import re
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


async def ensure_notes_embedded(user_id: str):
    """Ensure all user's notes have vector chunks in note_chunks."""
    db = get_database()
    try:
        notes = await db.notes.find({"user_id": ObjectId(user_id)}).to_list(100)
        chunk_note_ids = set(await db.note_chunks.distinct("note_id", {"user_id": ObjectId(user_id)}))
        for note in notes:
            if note["_id"] not in chunk_note_ids:
                asyncio.create_task(create_note_chunks(
                    str(note["_id"]),
                    user_id,
                    note.get("title", ""),
                    note.get("body", "")
                ))
    except Exception as e:
        logger.warning("ensure_notes_embedded_failed", error=str(e))


async def _keyword_search(user_id: str, query: str, limit: int = 5) -> List[dict]:
    """Find notes by keyword in title and body using regex search."""
    db = get_database()
    try:
        stop_words = {
            "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
            "did", "does", "done", "doing", "wrote", "write", "written", "about",
            "have", "has", "had", "with", "from", "that", "this", "these", "those",
            "your", "mine", "tell", "show", "give", "notes", "note", "saved"
        }
        raw_words = re.findall(r"\b[A-Za-z0-9_-]+\b", query.lower())
        terms = [w for w in raw_words if len(w) >= 2 and w not in stop_words]

        if not terms:
            return []

        regex_pattern = "|".join(re.escape(t) for t in terms)
        cursor = db.notes.find({
            "user_id": ObjectId(user_id),
            "$or": [
                {"title": {"$regex": regex_pattern, "$options": "i"}},
                {"body": {"$regex": regex_pattern, "$options": "i"}},
            ]
        }).limit(limit)

        matched_notes = await cursor.to_list(length=limit)
        results = []
        for n in matched_notes:
            body = n.get("body", "") or ""
            title = n.get("title", "Untitled Note")
            results.append({
                "note_id": str(n["_id"]),
                "title": title,
                "excerpt": f"{title}\n\n{body}"[:500],
                "score": 0.85,
                "user_id": user_id,
            })
        return results
    except Exception as e:
        logger.error("keyword_search_failed", error=str(e))
        return []


async def semantic_search(
    user_id: str,
    query: str,
    limit: int = 5,
    score_threshold: float = 0.3,
) -> List[dict]:
    """
    Perform hybrid retrieval over user's notes:
    1. Vector similarity search over note_chunks
    2. Direct keyword / regex search over notes
    3. Merged and deduplicated candidate ranking
    """
    db = get_database()
    settings = get_settings()

    # Trigger background embedding of any unembedded notes
    await ensure_notes_embedded(user_id)

    vector_results: List[dict] = []

    if settings.gemini_configured:
        query_embedding = await generate_query_embedding(query)
        if query_embedding is not None:
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

                verified_results = [
                    r for r in results
                    if str(r.get("user_id")) == user_id or r.get("user_id") == ObjectId(user_id)
                ]

                if verified_results:
                    vector_results = verified_results
                else:
                    vector_results = await _cosine_search(user_id, query, query_embedding, limit, score_threshold)

            except Exception as e:
                logger.warning("vector_search_atlas_index_unavailable_fallback_to_cosine", error=str(e))
                vector_results = await _cosine_search(user_id, query, query_embedding, limit, score_threshold)

    # Keyword search for direct term matches
    keyword_results = await _keyword_search(user_id, query, limit=limit)

    # Hybrid merge: deduplicate by note_id
    seen_ids = set()
    combined_results: List[dict] = []

    # Prioritize vector results that meet threshold, interspersed with keyword matches
    for res in keyword_results:
        nid = str(res.get("note_id"))
        if nid not in seen_ids:
            seen_ids.add(nid)
            combined_results.append(res)

    for res in vector_results:
        nid = str(res.get("note_id"))
        if nid not in seen_ids:
            seen_ids.add(nid)
            combined_results.append(res)

    if combined_results:
        return combined_results[:limit]

    # Final fallback to mongo text search if everything else returned nothing
    return await _keyword_fallback(user_id, query, limit)


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

    return []


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
