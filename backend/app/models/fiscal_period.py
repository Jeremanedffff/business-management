"""FiscalPeriod model - per-tenant accounting periods."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


# Supported fiscal period statuses
FISCAL_PERIOD_STATUSES = [
    "not_opened",
    "open",
    "closing",
    "closed",
    "closure_failed",
]


class FiscalPeriod(Base, TimestampMixin):
    """A fiscal period for a tenant - independent per tenant.

    Only one period per tenant may be in status 'open' at a time.
    Invoices snapshot the period they belong to at creation time.
    """

    __tablename__ = "fiscal_periods"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_fiscal_periods_tenant_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # One of FISCAL_PERIOD_STATUSES
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="not_opened", index=True,
    )

    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    opened_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<FiscalPeriod {self.name} ({self.status})>"