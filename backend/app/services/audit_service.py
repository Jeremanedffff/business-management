"""Audit service - write entries to the immutable audit trail.

Design:
- log_action() adds an entry to the session but does NOT commit.
  Caller commits as part of the same transaction as the business operation.
  This ensures the audit entry only exists if the operation succeeds.
- snapshot() serializes a model instance into a JSON-safe dict.
"""

from contextvars import ContextVar, Token
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

_request_context: ContextVar[tuple[str | None, str | None]] = ContextVar(
    "audit_request_context",
    default=(None, None),
)


def set_request_context(ip_address: str | None, user_agent: str | None) -> Token:
    return _request_context.set((ip_address, user_agent))


def reset_request_context(token: Token) -> None:
    _request_context.reset(token)


def log_action(
    db: Session,
    *,
    tenant_id: UUID | None,
    user_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    notes: str | None = None,
) -> AuditLog:
    """Add an audit log entry to the current session. Does not commit.

    The caller is responsible for db.commit(). This keeps the audit entry
    inside the same transaction as the business operation so that a
    rolled-back operation leaves no audit trail.
    """
    ip_address, user_agent = _request_context.get()
    entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        notes=notes,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    return entry


def snapshot(instance: object, fields: list[str]) -> dict | None:
    """Serialize selected fields of a model instance into a JSON-safe dict."""
    if instance is None:
        return None
    result: dict = {}
    for field in fields:
        val = getattr(instance, field, None)
        if isinstance(val, UUID):
            val = str(val)
        elif isinstance(val, Decimal):
            val = str(val)
        elif isinstance(val, (datetime, date)):
            val = val.isoformat()
        result[field] = val
    return result
