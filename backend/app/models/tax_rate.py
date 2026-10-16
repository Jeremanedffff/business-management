"""TaxRate model - VAT, levies, and other tax configurations."""

import uuid

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class TaxRate(Base, TimestampMixin):
    """A tax rate (VAT, levy, etc.) scoped to a tenant."""

    __tablename__ = "tax_rates"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_tax_rates_tenant_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Rate as decimal (e.g., 0.15 = 15%)
    rate: Mapped[Decimal] = mapped_column(Numeric(8, 5), nullable=False)

    # "VAT", "LEVY", "EXEMPT", "ZERO_RATED"
    tax_type: Mapped[str] = mapped_column(String(30), nullable=False, default="VAT")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Mark the tenant's default tax rate for new invoice lines
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Optional user-defined category grouping
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_categories.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    def __repr__(self) -> str:
        return f"<TaxRate {self.code} ({self.rate})>"

