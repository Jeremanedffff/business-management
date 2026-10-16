"""ProductCategory schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    code: str
    name: str
    description: str | None
    default_tax_rate_id: UUID | None
    sort_order: int
    is_active: bool


class ProductCategoryCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    default_tax_rate_id: UUID | None = None
    sort_order: int = 0


class ProductCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    default_tax_rate_id: UUID | None = None
    sort_order: int | None = None
    is_active: bool | None = None

