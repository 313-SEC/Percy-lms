"""
Application settings loaded from environment variables.
All secrets MUST be set in .env — never hard-coded.
"""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Security
    secret_key: str
    encryption_key: str  # Fernet key for API-key encryption at rest

    # App
    database_url: str = "sqlite:///./percy.db"
    storage_path: Path = Path("./storage")
    cors_origins: str = "http://localhost:5173"

    default_admin_password: str = "changeme"

    # JWT
    access_token_expire_seconds: int = 900       # 15 minutes
    refresh_token_expire_seconds: int = 604_800  # 7 days
    jwt_algorithm: str = "HS256"

    # Whisper
    whisper_model: str = "base"

    # File limits (MiB → bytes)
    max_video_size_mb: int = 10_240
    max_document_size_mb: int = 500

    # Rate limiting
    auth_rate_limit: str = "10/minute"
    ai_rate_limit: str = "20/minute"

    @property
    def max_video_bytes(self) -> int:
        return self.max_video_size_mb * 1024 * 1024

    @property
    def max_document_bytes(self) -> int:
        return self.max_document_size_mb * 1024 * 1024

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def ensure_storage_dirs(self) -> None:
        for sub in ("videos", "documents", "thumbnails", "subtitles", "exports"):
            (self.storage_path / sub).mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
