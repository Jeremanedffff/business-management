"""InvoiceItem model - line items within an invoice."""

import uuid
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class InvoiceItem(Base, TimestampMixin):
    """A single line item on an invoice."""

    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    line_number: Mapped[int] = mapped_column(Integer, nullable=False)

    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    tax_rate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_rates.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_categories.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # Snapshot: item number (product code or free text)
    item_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    description: Mapped[str] = mapped_column(String(500), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)

    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    line_tax: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    # Tax snapshot
    tax_rate_snapshot: Mapped[Decimal] = mapped_column(Numeric(8, 5), nullable=False, default=0)
    tax_name_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tax_code_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Flags
    is_service: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
    product: Mapped["Product | None"] = relationship("Product")
    tax_rate: Mapped["TaxRate | None"] = relationship("TaxRate")
    category: Mapped["ProductCategory | None"] = relationship("ProductCategory")

    def __repr__(self) -> str:
        return f"<InvoiceItem line={self.line_number} desc={self.description[:30]}>"

