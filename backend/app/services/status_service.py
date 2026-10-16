"""Status service."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.status import Status


def list_statuses(
    db: Session,
    tenant_id: UUID,
    entity_type: str | None = None,
    only_active: bool = True,
) -> list[Status]:
    stmt = select(Status).where(Status.tenant_id == tenant_id)
    if entity_type:
        stmt = stmt.where(Status.entity_type == entity_type)
    if only_active:
        stmt = stmt.where(Status.is_active.is_(True))
    stmt = stmt.order_by(Status.entity_type, Status.sort_order, Status.code)
    return list(db.execute(stmt).scalars().all())


def list_all_statuses(db: Session, entity_type: str | None = None, only_active: bool = True) -> list[Status]:
    """List all statuses across all tenants (superuser only)."""
    stmt = select(Status)
    if entity_type:
        stmt = stmt.where(Status.entity_type == entity_type)
    if only_active:
        stmt = stmt.where(Status.is_active.is_(True))
    stmt = stmt.order_by(Status.tenant_id, Status.entity_type, Status.sort_order, Status.code)
    return list(db.execute(stmt).scalars().all())


def get_status(db: Session, status_id: UUID) -> Status | None:
    return db.get(Status, status_id)


def create_status(db: Session, tenant_id: UUID, entity_type: str, code: str, name: str, color: str | None = None, sort_order: int = 0) -> Status:
    existing = db.execute(
        select(Status).where(
            Status.tenant_id == tenant_id,
            Status.entity_type == entity_type,
            Status.code == code,
        )
    ).scalar_one_or_none()
    if existing:
        raise ValueError(f"Status with code '{code}' already exists for entity type '{entity_type}' in this tenant")

    status = Status(
        tenant_id=tenant_id,
        entity_type=entity_type,
        code=code,
        name=name,
        color=color,
        sort_order=sort_order,
    )
    db.add(status)
    db.commit()
    db.refresh(status)
    return status


def update_status(db: Session, status_id: UUID, code: str | None = None, name: str | None = None, color: str | None = None, sort_order: int | None = None, is_active: bool | None = None) -> Status | None:
    status = get_status(db, status_id)
    if not status:
        return None

    if code is not None:
        existing = db.execute(
            select(Status).where(
                Status.tenant_id == status.tenant_id,
                Status.entity_type == status.entity_type,
                Status.code == code,
                Status.id != status_id,
            )
        ).scalar_one_or_none()
        if existing:
            raise ValueError(f"Status with code '{code}' already exists for entity type '{status.entity_type}' in this tenant")
        status.code = code

    if name is not None:
        status.name = name
    if color is not None:
        status.color = color
    if sort_order is not None:
        status.sort_order = sort_order
    if is_active is not None:
        status.is_active = is_active

    db.commit()
    db.refresh(status)
    return status


def delete_status(db: Session, status_id: UUID) -> bool:
    status = get_status(db, status_id)
    if not status:
        return False

    db.delete(status)
    db.commit()
    return True

