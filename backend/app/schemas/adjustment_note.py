"""Adjustment note schemas."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdjustmentNoteItemCreate(BaseModel):
    invoice_item_id: UUID | None = None
    description: str = Field(min_length=1, max_length=500)
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    tax_rate_id: UUID | None = None


class AdjustmentNoteItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    line_number: int
    invoice_item_id: UUID | None
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_subtotal: Decimal
    line_tax: Decimal
    line_total: Decimal
    tax_rate_snapshot: Decimal
    tax_code_snapshot: str | None


class AdjustmentNoteCreate(BaseModel):
    note_type: str = Field(pattern="^(credit|debit)$")
    invoice_id: UUID
    issue_date: date | None = None
    reason: str | None = None
    notes: str | None = None
    items: list[AdjustmentNoteItemCreate] = Field(min_length=1)


class AdjustmentNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    note_type: str
    note_number: str
    invoice_id: UUID
    customer_id: UUID
    status_id: UUID | None
    issue_date: date
    original_invoice_number_snapshot: str | None
    original_invoice_date_snapshot: date | None
    customer_reference_snapshot: str | None
    reason: str | None
    notes: str | None
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    items: list[AdjustmentNoteItemResponse] = []
    status_code: str | None = None
    status_name: str | None = None
