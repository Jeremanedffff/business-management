"""AdjustmentNote model - credit and debit notes against invoices."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class AdjustmentNote(Base, TimestampMixin):
    """A credit or debit note that adjusts an existing invoice."""

    __tablename__ = "adjustment_notes"
    __table_args__ = (
        UniqueConstraint("tenant_id", "note_number", name="uq_adjustment_notes_tenant_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # "credit" or "debit"
    note_type: Mapped[str] = mapped_column(String(10), nullable=False, index=True)

    # Auto-generated: CN-0001, DN-0001
    note_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Reference to original invoice
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    status_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("statuses.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # Note issue date
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Snapshots of the original invoice (immutable)
    original_invoice_number_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)
    original_invoice_date_snapshot: Mapped[date | None] = mapped_column(Date, nullable=True)
    customer_reference_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)

    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    fiscal_period_number: Mapped[int | None] = mapped_column(nullable=True)
    fiscal_receipt_global_no: Mapped[int | None] = mapped_column(nullable=True)
    fiscal_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fiscal_qr_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    items: Mapped[list["AdjustmentNoteItem"]] = relationship(
        "AdjustmentNoteItem", back_populates="note", cascade="all, delete-orphan",
        order_by="AdjustmentNoteItem.line_number",
    )
    invoice: Mapped["Invoice"] = relationship("Invoice")
    customer: Mapped["Customer"] = relationship("Customer")
    status: Mapped["Status | None"] = relationship("Status")

    def __repr__(self) -> str:
        return f"<AdjustmentNote {self.note_type} {self.note_number} total={self.total}>"

