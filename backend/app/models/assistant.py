"""
Pydantic schemas for Ask Echo and speech endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class AskRequest(BaseModel):
    """Ask Echo question request."""
    question: str = Field(..., min_length=1, max_length=1000)


class SourceReference(BaseModel):
    """A cited note source in an answer."""
    note_id: str
    title: str
    excerpt: str
    relevance_score: float = 0.0


class AskResponse(BaseModel):
    """Ask Echo answer response."""
    answer: str
    sources: List[SourceReference]
    disclaimer: str = "This answer is generated from your saved notes and may be incomplete."


class SpeechRequest(BaseModel):
    """Text-to-speech request."""
    text: str = Field(..., min_length=1, max_length=5000)


class SpeechStatusResponse(BaseModel):
    """Speech service status."""
    available: bool
    message: str
