"""Database session and engine management."""

import ssl
from collections.abc import Generator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


settings = get_settings()


def _prepare_database_url(url: str) -> str:
    """Prepare the PostgreSQL URL for the pg8000 driver."""
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql+pg8000://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+pg8000://", 1)

    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))

    # These parameters belong to libpq/psycopg and are not accepted by pg8000.
    query.pop("sslmode", None)
    query.pop("channel_binding", None)
    query.pop("options", None)

    return urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            parts.path,
            urlencode(query),
            parts.fragment,
        )
    )


_database_url = _prepare_database_url(settings.database_url)

_connect_args = {}

if _database_url.startswith("postgresql+pg8000://") and settings.database_ssl:
    _connect_args["ssl_context"] = ssl.create_default_context()


engine = create_engine(
    _database_url,
    pool_pre_ping=True,
    echo=False,
    future=True,
    connect_args=_connect_args,
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()