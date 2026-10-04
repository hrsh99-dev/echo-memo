"""
Pydantic schemas for authentication endpoints.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class UserResponse(BaseModel):
    """Public user profile response."""
    id: str
    email: str
    name: str
    created_at: str
    settings: dict = {}

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr
    password: str




class RefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Password reset request."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Password reset with token."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)




class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
