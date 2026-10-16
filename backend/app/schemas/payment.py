"""Payment schemas."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_date: date | None = None
    payment_method: str = Field(default="cash", max_length=30)
    payer_phone: str | None = Field(default=None, max_length=30)
    reference: str | None = None
    notes: str | None = None

    @field_validator("payer_phone")
    @classmethod
    def _validate_phone(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        cleaned = v.strip().replace(" ", "").replace("-", "")
        # Lesotho: +266XXXXXXXX or 266XXXXXXXX or XXXX XXXX (8 digits)
        if cleaned.startswith("+266"):
            digits = cleaned[4:]
        elif cleaned.startswith("266"):
            digits = cleaned[3:]
        else:
            digits = cleaned
        if not digits.isdigit():
            raise ValueError("Phone must contain only digits")
        if len(digits) != 8:
            raise ValueError("Lesotho phone number must have 8 digits after +266")
        return f"+266{digits}"


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    invoice_id: UUID
    amount: Decimal
    payment_date: date
    payment_method: str
    payer_phone: str | None
    reference: str | None
    notes: str | None


class PaymentMethodInfo(BaseModel):
    code: str
    label: str
    is_mobile_money: bool

