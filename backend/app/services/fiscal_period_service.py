"""Fiscal period service - per-tenant accounting period management."""

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fiscal_period import FiscalPeriod
from app.schemas.fiscal_period import (
    FiscalPeriodCreate,
    FiscalPeriodStatusInfo,
    FiscalPeriodUpdate,
)


class FiscalPeriodError(Exception):
    """Domain error for fiscal period operations."""

    def __init__(self, message: str = "Fiscal period error") -> None:
        self.message = message
        super().__init__(message)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------


def list_periods(db: Session, tenant_id: UUID) -> list[FiscalPeriod]:
    stmt = (
        select(FiscalPeriod)
        .where(FiscalPeriod.tenant_id == tenant_id)
        .order_by(FiscalPeriod.start_date.desc())
    )
    return list(db.execute(stmt).scalars().all())


def get_period(db: Session, tenant_id: UUID, period_id: UUID) -> FiscalPeriod | None:
    stmt = select(FiscalPeriod).where(
        FiscalPeriod.tenant_id == tenant_id,
        FiscalPeriod.id == period_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_current_open_period(db: Session, tenant_id: UUID) -> FiscalPeriod | None:
    stmt = select(FiscalPeriod).where(
        FiscalPeriod.tenant_id == tenant_id,
        FiscalPeriod.status == "open",
    )
    return db.execute(stmt).scalar_one_or_none()


def get_status_info(db: Session, tenant_id: UUID) -> FiscalPeriodStatusInfo:
    """Compact status info used by the invoice screens."""
    period = get_current_open_period(db, tenant_id)
    if period is None:
        return FiscalPeriodStatusInfo(status="not_opened")

    days_remaining = (period.end_date - date.today()).days
    return FiscalPeriodStatusInfo(
        period_id=period.id,
        name=period.name,
        status=period.status,
        start_date=period.start_date,
        end_date=period.end_date,
        days_remaining=days_remaining,
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _validate_date_range(start: date, end: date) -> None:
    if end < start:
        raise FiscalPeriodError("End date must be on or after start date.")


def _check_overlap(
    db: Session,
    tenant_id: UUID,
    start: date,
    end: date,
    exclude_id: UUID | None = None,
) -> None:
    """Raise if another period overlaps the given range."""
    stmt = select(FiscalPeriod).where(
        FiscalPeriod.tenant_id == tenant_id,
        FiscalPeriod.start_date <= end,
        FiscalPeriod.end_date >= start,
    )
    if exclude_id is not None:
        stmt = stmt.where(FiscalPeriod.id != exclude_id)

    existing = db.execute(stmt).scalars().first()
    if existing is not None:
        raise FiscalPeriodError(
            f"This date range overlaps with an existing period: {existing.name} "
            f"({existing.start_date} to {existing.end_date})."
        )


# ---------------------------------------------------------------------------
# Create / Update / Delete
# ---------------------------------------------------------------------------


def create_period(
    db: Session, tenant_id: UUID, payload: FiscalPeriodCreate
) -> FiscalPeriod:
    _validate_date_range(payload.start_date, payload.end_date)
    _check_overlap(db, tenant_id, payload.start_date, payload.end_date)

    period = FiscalPeriod(
        tenant_id=tenant_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="not_opened",
        notes=payload.notes,
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


def update_period(
    db: Session,
    tenant_id: UUID,
    period_id: UUID,
    payload: FiscalPeriodUpdate,
) -> FiscalPeriod:
    period = get_period(db, tenant_id, period_id)
    if period is None:
        raise FiscalPeriodError("Fiscal period not found.")

    if period.status != "not_opened":
        raise FiscalPeriodError(
            "Only periods that have not been opened can be edited."
        )

    update_data = payload.model_dump(exclude_unset=True)

    new_start = update_data.get("start_date", period.start_date)
    new_end = update_data.get("end_date", period.end_date)
    _validate_date_range(new_start, new_end)
    _check_overlap(db, tenant_id, new_start, new_end, exclude_id=period_id)

    for field, value in update_data.items():
        setattr(period, field, value)

    db.commit()
    db.refresh(period)
    return period


def delete_period(db: Session, tenant_id: UUID, period_id: UUID) -> None:
    period = get_period(db, tenant_id, period_id)
    if period is None:
        raise FiscalPeriodError("Fiscal period not found.")
    if period.status != "not_opened":
        raise FiscalPeriodError("Only periods that have not been opened can be deleted.")
    db.delete(period)
    db.commit()


# ---------------------------------------------------------------------------
# Open / Close
# ---------------------------------------------------------------------------


def open_period(
    db: Session, tenant_id: UUID, user_id: UUID, period_id: UUID
) -> FiscalPeriod:
    period = get_period(db, tenant_id, period_id)
    if period is None:
        raise FiscalPeriodError("Fiscal period not found.")

    if period.status == "open":
        raise FiscalPeriodError("This period is already open.")
    if period.status == "closed":
        raise FiscalPeriodError("Closed periods cannot be reopened.")

    current_open = get_current_open_period(db, tenant_id)
    if current_open is not None:
        raise FiscalPeriodError(
            f"Another period is already open: {current_open.name}. "
            f"Close it before opening a new period."
        )

    period.status = "open"
    period.opened_at = _now()
    period.opened_by_user_id = user_id
    db.commit()
    db.refresh(period)
    return period


def close_period(
    db: Session, tenant_id: UUID, user_id: UUID, period_id: UUID
) -> FiscalPeriod:
    period = get_period(db, tenant_id, period_id)
    if period is None:
        raise FiscalPeriodError("Fiscal period not found.")

    if period.status != "open":
        raise FiscalPeriodError("Only open periods can be closed.")

    period.status = "closed"
    period.closed_at = _now()
    period.closed_by_user_id = user_id
    db.commit()
    db.refresh(period)
    return period