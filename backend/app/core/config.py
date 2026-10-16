"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Enterprise BMS"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # Security
    secret_key: str = Field(default="change-me", min_length=1)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Database
    database_url: str = "postgresql+psycopg://user:password@host/dbname"
    database_ssl: bool = True

    # CORS
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Email (invitations and notifications)
    email_provider: str = "brevo"
    email_api_key: str = ""
    email_from_address: str = "no-reply@mrservices.co.ls"
    email_from_name: str = "MalutiRecon"
    invitation_expires_hours: int = 24


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()