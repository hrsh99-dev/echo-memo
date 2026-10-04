"""
Authentication router: register, login, logout, refresh, forgot-password.
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status, Request
from app.core.database import get_database
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
    get_current_user,
)
from app.core.config import get_settings
from app.models.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    ForgotPasswordRequest,
    UserResponse,
    MessageResponse,
)
from bson import ObjectId
from fastapi import Depends
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register a new user account."""
    db = get_database()

    # Check for existing user (non-enumerating: same error for all failures)
    email_normalized = request.email.lower().strip()
    existing = await db.users.find_one({"email_normalized": email_normalized})

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Create user
    now = datetime.now(timezone.utc)
    user_doc = {
        "email_normalized": email_normalized,
        "password_hash": hash_password(request.password),
        "name": request.name.strip(),
        "created_at": now,
        "settings": {
            "audio_retention": False,
            "playback_speed": 1.0,
        },
        "deletion_status": None,
    }

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Generate tokens
    access_token = create_access_token(user_id, email_normalized)
    refresh_token = create_refresh_token()

    # Store refresh token hash
    settings = get_settings()
    await db.refresh_tokens.insert_one({
        "token_hash": hash_token(refresh_token),
        "user_id": ObjectId(user_id),
        "expires_at": now + timedelta(days=settings.auth_refresh_token_expire_days),
        "created_at": now,
    })

    logger.info("user_registered", user_id=user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user_id,
            email=email_normalized,
            name=user_doc["name"],
            created_at=now.isoformat(),
            settings=user_doc["settings"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate and return tokens."""
    db = get_database()

    email_normalized = request.email.lower().strip()
    user = await db.users.find_one({"email_normalized": email_normalized})

    # Non-enumerating error
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.get("deletion_status") == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is pending deletion.",
        )

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email_normalized)
    refresh_token = create_refresh_token()

    settings = get_settings()
    now = datetime.now(timezone.utc)
    await db.refresh_tokens.insert_one({
        "token_hash": hash_token(refresh_token),
        "user_id": user["_id"],
        "expires_at": now + timedelta(days=settings.auth_refresh_token_expire_days),
        "created_at": now,
    })

    logger.info("user_login", user_id=user_id)

    created_at_val = user.get("created_at")
    created_at_str = created_at_val.isoformat() if hasattr(created_at_val, "isoformat") else str(created_at_val or now.isoformat())

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user_id,
            email=email_normalized,
            name=user.get("name", ""),
            created_at=created_at_str,
            settings=user.get("settings", {}),
        ),
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: RefreshRequest,
    user: dict = Depends(get_current_user),
):
    """Revoke the refresh token to end the session."""
    db = get_database()

    await db.refresh_tokens.delete_one({
        "token_hash": hash_token(request.refresh_token),
        "user_id": user["_id"],
    })

    logger.info("user_logout", user_id=str(user["_id"]))
    return MessageResponse(message="Logged out successfully.")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest):
    """Exchange a refresh token for a new token pair."""
    db = get_database()
    settings = get_settings()

    token_doc = await db.refresh_tokens.find_one({
        "token_hash": hash_token(request.refresh_token),
    })

    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    # Check expiration
    if token_doc["expires_at"] < datetime.now(timezone.utc):
        await db.refresh_tokens.delete_one({"_id": token_doc["_id"]})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired.",
        )

    # Get user
    user = await db.users.find_one({"_id": token_doc["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    # Rotate: delete old, create new
    await db.refresh_tokens.delete_one({"_id": token_doc["_id"]})

    user_id = str(user["_id"])
    new_access = create_access_token(user_id, user["email_normalized"])
    new_refresh = create_refresh_token()

    now = datetime.now(timezone.utc)
    await db.refresh_tokens.insert_one({
        "token_hash": hash_token(new_refresh),
        "user_id": user["_id"],
        "expires_at": now + timedelta(days=settings.auth_refresh_token_expire_days),
        "created_at": now,
    })

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """
    Start password reset flow.
    Always returns the same message to prevent email enumeration.
    """
    # In a real app, send an email with a reset link here
    logger.info("password_reset_requested", email_hash=hash(request.email))
    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    return UserResponse(
        id=str(user["_id"]),
        email=user["email_normalized"],
        name=user.get("name", ""),
        created_at=user["created_at"].isoformat(),
        settings=user.get("settings", {}),
    )
