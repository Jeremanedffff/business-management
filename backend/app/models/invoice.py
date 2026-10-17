"""Invoice model - the core business entity."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Invoice(Base, TimestampMixin):
    """An invoice issued to a customer."""

    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("tenant_id", "invoice_number", name="uq_invoices_tenant_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="FiscalInvoice",
        server_default="FiscalInvoice",
    )
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Public verification token (used in QR code on the printed invoice)
    verify_token: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, unique=True, index=True,
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    status_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("statuses.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    currency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("currencies.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    # Customer snapshot (immutable history)
    customer_name_snapshot: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_vat_number_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_address_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_tin_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_trading_name_snapshot: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Seller (tenant) snapshot (immutable history for Lekuka compliance)
    seller_tin_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)
    seller_vat_number_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)
    seller_name_snapshot: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seller_trading_name_snapshot: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seller_address_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Creator snapshot (who issued this invoice)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_name_snapshot: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Dates
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Totals
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    discount_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Fiscal period snapshot (per-tenant internal periods)
    fiscal_period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fiscal_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    fiscal_period_name_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Fiscal / Lekuka fields (populated in Stage 10)
    fiscal_period_number: Mapped[int | None] = mapped_column(nullable=True)
    device_serial_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_id_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fiscal_receipt_global_no: Mapped[int | None] = mapped_column(nullable=True, index=True)
    fiscal_receipt_counter: Mapped[int | None] = mapped_column(nullable=True)
    fiscal_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fiscal_qr_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    items: Mapped[list["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan",
        order_by="InvoiceItem.line_number",
    )
    customer: Mapped["Customer"] = relationship("Customer")
    status: Mapped["Status | None"] = relationship("Status")
    currency: Mapped["Currency"] = relationship("Currency")

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number} total={self.total}>"
