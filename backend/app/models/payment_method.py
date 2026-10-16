"""PaymentMethod model - per-tenant payment methods shown on invoices."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


# Supported payment method types. Kept here so it is the single source of truth.
PAYMENT_METHOD_TYPES = {
    "bank":    {"label": "Bank Transfer", "fields": ["bank_name", "branch", "branch_code", "account_number", "account_holder"]},
    "mpesa":   {"label": "M-Pesa",        "fields": ["number", "account_name"]},
    "ecocash": {"label": "EcoCash",       "fields": ["number", "account_name"]},
    "cash":    {"label": "Cash",          "fields": []},
    "cheque":  {"label": "Cheque",        "fields": ["payable_to"]},
    "card":    {"label": "Card",          "fields": ["merchant_name", "terminal_reference"]},
}


class PaymentMethod(Base, TimestampMixin):
    """A payment method configured by a tenant.

    Each tenant chooses which methods to offer and fills in the details
    for each. Invoices show the tenant's active methods, with the
    preferred one highlighted and shown first.
    """

    __tablename__ = "payment_methods"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # One of PAYMENT_METHOD_TYPES keys: bank, mpesa, ecocash, cash, cheque, card
    type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    # Tenant-facing name (e.g. "M-Pesa", "FNB Lesotho Account")
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Free-form key/value per type - see PAYMENT_METHOD_TYPES["fields"]
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Only one per tenant should be True. Enforced in service layer.
    is_preferred: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Display order on the invoice (lower number = shown first)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<PaymentMethod {self.type} {self.display_name}>"