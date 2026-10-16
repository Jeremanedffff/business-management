"""Audit read service - query the audit log.

Separate from audit_service.py (which writes) so the write side
stays small and dependency-light.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def list_audit_logs(
    db: Session,
    tenant_id: UUID | None,
    *,
    entity_type: str | None = None,
    action: str | None = None,
    user_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[AuditLog], int]:
    stmt = select(AuditLog)
    if tenant_id is not None:
        stmt = stmt.where(AuditLog.tenant_id == tenant_id)

    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    items = list(db.execute(stmt).scalars().all())
    return items, total


def get_audit_log(
    db: Session, tenant_id: UUID, audit_log_id: UUID
) -> AuditLog | None:
    stmt = select(AuditLog).where(
        AuditLog.tenant_id == tenant_id,
        AuditLog.id == audit_log_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def list_for_entity(
    db: Session,
    tenant_id: UUID,
    entity_type: str,
    entity_id: UUID,
    *,
    limit: int = 100,
) -> list[AuditLog]:
    stmt = (
        select(AuditLog)
        .where(
            AuditLog.tenant_id == tenant_id,
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id,
        )
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())
