"""Public (unauthenticated) schemas."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class PublicInvoiceVerifyResponse(BaseModel):
    invoice_number: str
    issue_date: date
    total: Decimal
    currency_code: str
    status_code: str
    status_name: str
    company_name: str | None
    verified_at: datetime
