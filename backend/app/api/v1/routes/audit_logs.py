"""Audit log routes - read the audit trail."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse
from app.services import audit_read_service


router = APIRouter(prefix="/audit-logs", tags=["audit_logs"])


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superuser access."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


@router.get("/", response_model=AuditLogListResponse)
def list_audit_logs(
    entity_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    items, total = audit_read_service.list_audit_logs(
        db,
        current_user.tenant_id,
        entity_type=entity_type,
        action=action,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/system", response_model=AuditLogListResponse)
def list_system_audit_logs(
    entity_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    """List all audit logs across all tenants (superuser only)."""
    items, total = audit_read_service.list_audit_logs(
        db,
        tenant_id=None,  # None means all tenants
        entity_type=entity_type,
        action=action,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/for-entity/{entity_type}/{entity_id}",
    response_model=list[AuditLogResponse],
)
def list_audit_for_entity(
    entity_type: str,
    entity_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> list[AuditLog]:
    return audit_read_service.list_for_entity(
        db, current_user.tenant_id, entity_type, entity_id
    )


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
def get_audit_log(
    audit_log_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> AuditLog:
    entry = audit_read_service.get_audit_log(
        db, current_user.tenant_id, audit_log_id
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    return entry
