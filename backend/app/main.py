"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.error_handlers import register_error_handlers
from app.core.logging import get_logger, setup_logging
from app.services.audit_service import reset_request_context, set_request_context


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup and shutdown events."""
    setup_logging()
    logger = get_logger(__name__)
    settings = get_settings()
    logger.info("Starting %s (env=%s)", settings.app_name, settings.app_env)
    yield
    logger.info("Shutting down %s", settings.app_name)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8001", "http://127.0.0.1:8001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def capture_audit_request_context(request: Request, call_next):
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        token = set_request_context(
            ip_address,
            user_agent[:500] if user_agent else None,
        )
        try:
            return await call_next(request)
        finally:
            reset_request_context(token)

    # Error handlers
    register_error_handlers(app)

    # Health check
    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "app": settings.app_name}

    # API v1
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
