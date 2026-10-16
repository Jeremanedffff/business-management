"""Invitation schemas - request and response shapes for the invitation API."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class InvitationCreate(BaseModel):
    """Payload for an admin creating an invitation."""

    email: EmailStr
    role_id: UUID | None = None
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)


class InvitationResponse(BaseModel):
    """Full invitation record (admin-facing)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: EmailStr
    first_name: str | None
    last_name: str | None
    role_id: UUID | None
    invited_by_user_id: UUID | None
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None
    email_sent_at: datetime | None
    created_at: datetime


class InvitationPreview(BaseModel):
    """Safe preview of an invitation (shown on the public register page)."""

    email: EmailStr
    first_name: str | None
    last_name: str | None
    tenant_name: str
    role_name: str | None
    expires_at: datetime


class InvitationAccept(BaseModel):
    """Payload for an invited user completing registration."""

    token: str = Field(min_length=20)
    password: str = Field(min_length=8, max_length=100)
    confirm_password: str = Field(min_length=8, max_length=100)