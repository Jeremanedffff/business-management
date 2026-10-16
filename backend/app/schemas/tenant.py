"""Tenant schemas for superuser operations."""

from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    legal_name: str | None
    trading_name: str | None
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    country: str | None
    postal_code: str | None
    tin: str | None
    vat_number: str | None
    registration_number: str | None
    business_type: str | None
    industry: str | None
    website: str | None
    logo_url: str | None
    is_active: bool


class TenantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=100)
    legal_name: str | None = Field(None, max_length=200)
    trading_name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    address: str | None = None
    city: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    tin: str | None = Field(None, max_length=50)
    vat_number: str | None = Field(None, max_length=50)
    registration_number: str | None = Field(None, max_length=50)
    business_type: str | None = Field(None, max_length=50)
    industry: str | None = Field(None, max_length=100)
    website: str | None = Field(None, max_length=500)
    logo_url: str | None = Field(None, max_length=500)


class TenantCreateWithAdmin(TenantCreate):
    admin_email: EmailStr
    admin_password: str = Field(min_length=8, max_length=100)
    admin_first_name: str | None = None
    admin_last_name: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    legal_name: str | None = Field(None, max_length=200)
    trading_name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    address: str | None = None
    city: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    tin: str | None = Field(None, max_length=50)
    vat_number: str | None = Field(None, max_length=50)
    registration_number: str | None = Field(None, max_length=50)
    business_type: str | None = Field(None, max_length=50)
    industry: str | None = Field(None, max_length=100)
    website: str | None = Field(None, max_length=500)
    logo_url: str | None = Field(None, max_length=500)
    is_active: bool | None = None
