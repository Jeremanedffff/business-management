"""Customer schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    trading_name: str | None = None
    tin: str | None = None
    vat_number: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    customer_type: str = "business"


class CustomerCreate(CustomerBase):
    code: str | None = None  # auto-generated if not provided


class CustomerUpdate(BaseModel):
    name: str | None = None
    trading_name: str | None = None
    tin: str | None = None
    vat_number: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    customer_type: str | None = None
    is_active: bool | None = None


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    code: str
    name: str
    trading_name: str | None
    tin: str | None
    vat_number: str | None
    email: str | None
    phone: str | None
    address: str | None
    customer_type: str
    is_active: bool

