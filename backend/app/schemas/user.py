"""User schemas for admin operations."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    tenant_name: str | None = None
    email: EmailStr
    first_name: str | None
    last_name: str | None
    is_active: bool
    is_superuser: bool


class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    first_name: str | None = None
    last_name: str | None = None
    is_superuser: bool = False


class UserUpdateAdmin(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None


class UserWithRoles(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    first_name: str | None
    last_name: str | None
    is_active: bool
    is_superuser: bool
    role_ids: list[UUID] = []
    role_names: list[str] = []


class AssignRoleRequest(BaseModel):
    role_id: UUID

