"""Payment method schemas - request and response shapes for the payment methods API."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PaymentMethodBase(BaseModel):
    type: str = Field(max_length=30)
    display_name: str = Field(min_length=1, max_length=100)
    details: dict = Field(default_factory=dict)
    is_preferred: bool = False
    sort_order: int = 0
    is_active: bool = True


class PaymentMethodCreate(PaymentMethodBase):
    """Payload to create a new payment method."""


class PaymentMethodUpdate(BaseModel):
    """Payload to update a payment method (all fields optional)."""

    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    details: dict | None = None
    is_preferred: bool | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class PaymentMethodResponse(PaymentMethodBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime


class PaymentMethodTypeInfo(BaseModel):
    """Info about one supported payment method type (used to render the add-method form)."""

    type: str
    label: str
    fields: list[str]