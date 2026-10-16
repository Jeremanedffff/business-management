"""Setting schemas."""

from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class SettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    key: str
    value: str | None
    description: str | None


class SettingUpdate(BaseModel):
    value: str


class TenantSettingCreate(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    value: str
    description: str | None = None


class TenantSettingUpdate(BaseModel):
    value: str | None = None
    description: str | None = None
