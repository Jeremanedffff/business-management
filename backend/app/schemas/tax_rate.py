"""TaxRate schemas."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaxRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    code: str
    name: str
    description: str | None
    rate: Decimal
    tax_type: str
    is_active: bool
    is_default: bool
    category_id: UUID | None


class TaxRateCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    rate: Decimal = Field(ge=0, le=1)
    tax_type: str = Field(default="VAT", max_length=30)
    is_default: bool = False
    category_id: UUID | None = None


class TaxRateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    rate: Decimal | None = Field(default=None, ge=0, le=1)
    tax_type: str | None = Field(default=None, max_length=30)
    is_active: bool | None = None
    is_default: bool | None = None
    category_id: UUID | None = None