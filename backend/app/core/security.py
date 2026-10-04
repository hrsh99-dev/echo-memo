"""
Security utilities: JWT tokens, password hashing, and authentication dependencies.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import get_settings
from app.core.database import get_database
from bson import ObjectId
import hashlib
import secrets
import structlog
import bcrypt

logger = structlog.get_logger()

security_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using native bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as e:
        logger.warning("password_verification_failed", error=str(e))
        return False


def create_access_token(user_id: str, email: str) -> str:
    """Create a short-lived JWT access token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.auth_token_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.auth_secret, algorithm=settings.auth_algorithm)


def create_refresh_token() -> str:
    """Create a cryptographically secure refresh token."""
    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    """Hash a refresh token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=[settings.auth_algorithm])
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> dict:
    """
    Extract and validate the current user from the Authorization header.
    Returns the user document from the database.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.get("deletion_status") == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending deletion",
        )

    return user
