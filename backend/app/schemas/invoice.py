"""Invoice schemas."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemCreate(BaseModel):
    product_id: UUID | None = None
    tax_rate_id: UUID | None = None
    description: str = Field(min_length=1, max_length=500)
    unit: str | None = None
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    discount_amount: Decimal = Field(ge=0, default=Decimal("0"))


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    line_number: int
    product_id: UUID | None
    tax_rate_id: UUID | None
    category_id: UUID | None
    item_number: str | None
    description: str
    unit: str | None
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal
    line_subtotal: Decimal
    line_tax: Decimal
    line_total: Decimal
    tax_rate_snapshot: Decimal
    tax_name_snapshot: str | None
    tax_code_snapshot: str | None
    returned_qty: Decimal = Decimal("0")
    is_service: bool


class InvoiceCreate(BaseModel):
    customer_id: UUID
    currency_id: UUID | None = None
    issue_date: date | None = None
    due_date: date | None = None
    reference: str | None = None
    notes: str | None = None
    terms: str | None = None
    items: list[InvoiceItemCreate] = Field(min_length=1)


class InvoiceUpdate(BaseModel):
    reference: str | None = None
    notes: str | None = None
    terms: str | None = None
    due_date: date | None = None
    items: list[InvoiceItemCreate] | None = None


class PaymentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    payment_date: date
    payment_method: str
    reference: str | None
    notes: str | None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    invoice_number: str
    reference: str | None
    verify_token: UUID | None
    customer_id: UUID
    status_id: UUID | None
    currency_id: UUID
    customer_name_snapshot: str | None
    customer_vat_number_snapshot: str | None
    customer_address_snapshot: str | None
    customer_tin_snapshot: str | None
    customer_trading_name_snapshot: str | None
    seller_tin_snapshot: str | None
    seller_vat_number_snapshot: str | None
    seller_name_snapshot: str | None
    seller_trading_name_snapshot: str | None
    seller_address_snapshot: str | None
    issue_date: date
    issued_at: datetime | None
    due_date: date | None
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    amount_paid: Decimal
    notes: str | None
    terms: str | None
    fiscal_period_id: UUID | None
    fiscal_period_name_snapshot: str | None
    fiscal_period_number: int | None
    created_by_user_id: UUID | None
    created_by_name_snapshot: str | None
    device_serial_snapshot: str | None
    device_id_snapshot: str | None
    items: list[InvoiceItemResponse] = []
    status_code: str | None = None
    status_name: str | None = None


class InvoiceDetailResponse(InvoiceResponse):
    """Extended invoice response with payment history and adjustment totals."""

    payments: list[PaymentSummary] = []
    total_credits: Decimal = Decimal("0")
    total_debits: Decimal = Decimal("0")


class StatusChangeRequest(BaseModel):
    status_code: str = Field(min_length=1, max_length=50)

