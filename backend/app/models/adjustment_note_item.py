"""AdjustmentNoteItem model - line items within a credit or debit note."""

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class AdjustmentNoteItem(Base, TimestampMixin):
    """A single line on a credit or debit note."""

    __tablename__ = "adjustment_note_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    note_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("adjustment_notes.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    line_number: Mapped[int] = mapped_column(Integer, nullable=False)

    invoice_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    description: Mapped[str] = mapped_column(String(500), nullable=False)

    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    line_tax: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    tax_rate_snapshot: Mapped[Decimal] = mapped_column(Numeric(8, 5), nullable=False, default=0)
    tax_code_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)

    note: Mapped["AdjustmentNote"] = relationship("AdjustmentNote", back_populates="items")

    def __repr__(self) -> str:
        return f"<AdjustmentNoteItem line={self.line_number}>"

