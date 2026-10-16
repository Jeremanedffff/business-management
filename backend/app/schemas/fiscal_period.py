"""Fiscal period schemas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FiscalPeriodBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    start_date: date
    end_date: date
    notes: str | None = None


class FiscalPeriodCreate(FiscalPeriodBase):
    """Payload to create a new fiscal period."""


class FiscalPeriodUpdate(BaseModel):
    """Payload to update a fiscal period (all fields optional)."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class FiscalPeriodResponse(FiscalPeriodBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    status: str
    opened_at: datetime | None
    opened_by_user_id: UUID | None
    closed_at: datetime | None
    closed_by_user_id: UUID | None
    failure_reason: str | None
    created_at: datetime
    updated_at: datetime


class FiscalPeriodStatusInfo(BaseModel):
    """Compact status info used by invoice screens."""

    period_id: UUID | None = None
    name: str | None = None
    status: str
    start_date: date | None = None
    end_date: date | None = None
    days_remaining: int | None = None