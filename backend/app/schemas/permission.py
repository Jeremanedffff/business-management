"""Permission schemas."""

from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    module: str
    action: str
    description: str | None


class PermissionCreate(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    module: str = Field(min_length=1, max_length=50)
    action: str = Field(min_length=1, max_length=50)
    description: str | None = None


class PermissionUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=100)
    module: str | None = Field(default=None, min_length=1, max_length=50)
    action: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None
