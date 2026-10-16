"""ProductCategory model - dynamic categories per tenant."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ProductCategory(Base, TimestampMixin):
    """A category for products or services, scoped to a tenant."""

    __tablename__ = "product_categories"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_product_categories_tenant_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Auto-fill VAT code when this category is picked
    default_tax_rate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_rates.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    default_tax_rate: Mapped["TaxRate | None"] = relationship("TaxRate")

    def __repr__(self) -> str:
        return f"<ProductCategory {self.code}: {self.name}>"

