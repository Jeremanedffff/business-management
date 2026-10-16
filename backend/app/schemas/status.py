"""Status schemas."""

from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class StatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    entity_type: str
    code: str
    name: str
    color: str | None
    sort_order: int
    is_active: bool


class StatusCreate(BaseModel):
    tenant_id: UUID
    entity_type: str = Field(min_length=1, max_length=50)
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=20)
    sort_order: int = Field(default=0, ge=0)


class StatusUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=20)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

