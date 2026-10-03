"""
Typed application settings loaded from environment variables.
Uses pydantic-settings for validation and type coercion.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application configuration. All values come from environment variables."""

    # Application
    app_env: str = Field(default="development", alias="APP_ENV")
    frontend_origin: str = Field(default="http://localhost:5173", alias="FRONTEND_ORIGIN")

    # MongoDB
    mongodb_uri: str = Field(..., alias="MONGODB_URI")
    mongodb_database: str = Field(default="echomemo", alias="MONGODB_DATABASE")
    vector_search_index: str = Field(default="autoembed_index", alias="VECTOR_SEARCH_INDEX")

    # Auth
    auth_secret: str = Field(..., alias="AUTH_SECRET")
    auth_token_expire_minutes: int = Field(default=30, alias="AUTH_TOKEN_EXPIRE_MINUTES")
    auth_refresh_token_expire_days: int = Field(default=7, alias="AUTH_REFRESH_TOKEN_EXPIRE_DAYS")
    auth_algorithm: str = "HS256"

    # ElevenLabs
    elevenlabs_api_key: Optional[str] = Field(default=None, alias="ELEVENLABS_API_KEY")
    elevenlabs_voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM", alias="ELEVENLABS_VOICE_ID")

    # Google Gemini
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    embedding_model: str = Field(default="models/gemini-embedding-001", alias="EMBEDDING_MODEL")
    generation_model: str = Field(default="models/gemini-3.8-flash", alias="GENERATION_MODEL")

    # Audio
    audio_retention_enabled: bool = Field(default=False, alias="AUDIO_RETENTION_ENABLED")
    audio_max_bytes: int = Field(default=15_728_640, alias="AUDIO_MAX_BYTES")  # 15 MB
    audio_max_seconds: int = Field(default=180, alias="AUDIO_MAX_SECONDS")  # 3 minutes

    # Rate limiting
    rate_limit_login: str = Field(default="5/minute", alias="RATE_LIMIT_LOGIN")
    rate_limit_transcribe: str = Field(default="10/minute", alias="RATE_LIMIT_TRANSCRIBE")
    rate_limit_ask: str = Field(default="10/minute", alias="RATE_LIMIT_ASK")
    rate_limit_speech: str = Field(default="10/minute", alias="RATE_LIMIT_SPEECH")
    rate_limit_inbox: str = Field(default="5/minute", alias="RATE_LIMIT_INBOX")

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def elevenlabs_configured(self) -> bool:
        return bool(self.elevenlabs_api_key and self.elevenlabs_api_key != "your_elevenlabs_api_key")

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key and self.gemini_api_key != "your_gemini_api_key")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Singleton
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get cached settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
