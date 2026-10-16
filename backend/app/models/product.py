"""Product model - products and services sold by the business."""

import uuid

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Product(Base, TimestampMixin):
    """A product or service offered by the business."""

    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_products_tenant_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(String(20), default="unit", nullable=False)

    selling_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    tax_rate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_rates.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_categories.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    item_type: Mapped[str] = mapped_column(String(20), default="product", nullable=False)
    track_inventory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tax_rate: Mapped["TaxRate | None"] = relationship("TaxRate")
    category: Mapped["ProductCategory | None"] = relationship("ProductCategory")

    def __repr__(self) -> str:
        return f"<Product {self.code} {self.name}>"

