"""Payment model - payments recorded against invoices."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Payment(Base, TimestampMixin):
    """A payment received against an invoice."""

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)

    # cash, bank_transfer, mpesa, ecocash, card, cheque, other
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False, default="cash")

    # For mobile money: customer phone that sent the payment
    payer_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    invoice: Mapped["Invoice"] = relationship("Invoice")

    def __repr__(self) -> str:
        return f"<Payment {self.amount} ({self.payment_method}) for invoice {self.invoice_id}>"

