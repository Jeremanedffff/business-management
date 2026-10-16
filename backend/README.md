# Backend - Enterprise BMS

FastAPI application.

## Structure

- `app/api/v1/routes/` - HTTP endpoints
- `app/api/v1/deps/` - dependencies (auth, tenant, permissions)
- `app/core/` - config, security, exceptions
- `app/db/` - database session management
- `app/models/` - SQLAlchemy ORM models
- `app/schemas/` - Pydantic request/response schemas
- `app/repositories/` - data access layer
- `app/services/` - business logic
- `app/compliance/` - separated compliance engine (tax, counters, fiscal period)
- `app/integrations/lekuka/` - isolated Lekuka adapter
- `app/tasks/` - background tasks

## Status

Skeleton stage - no business logic yet.

