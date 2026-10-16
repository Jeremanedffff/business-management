"""Authentication schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: EmailStr
    first_name: str | None
    last_name: str | None
    is_active: bool
    is_superuser: bool


class MeResponse(BaseModel):
    user: UserResponse
    tenant_id: UUID
    tenant_name: str
    permissions: list[str] = []

