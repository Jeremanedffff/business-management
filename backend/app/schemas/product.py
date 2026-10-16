"""Product schemas."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    unit: str = "unit"
    selling_price: Decimal = Field(ge=0)
    cost_price: Decimal = Field(ge=0, default=Decimal("0"))
    tax_rate_id: UUID | None = None
    item_type: str = "product"
    track_inventory: bool = False


class ProductCreate(ProductBase):
    code: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    unit: str | None = None
    selling_price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    tax_rate_id: UUID | None = None
    item_type: str | None = None
    track_inventory: bool | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    code: str
    name: str
    description: str | None
    unit: str
    selling_price: Decimal
    cost_price: Decimal
    tax_rate_id: UUID | None
    item_type: str
    track_inventory: bool
    is_active: bool

