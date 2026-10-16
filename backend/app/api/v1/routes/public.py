"""Public routes - no authentication required."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.schemas.public import PublicInvoiceVerifyResponse
from app.services import invoice_service, setting_service


router = APIRouter(prefix="/public", tags=["public"])


@router.get("/verify/{token}", response_model=PublicInvoiceVerifyResponse)
def verify_invoice(
    token: UUID,
    db: Session = Depends(get_db),
) -> PublicInvoiceVerifyResponse:
    invoice = invoice_service.verify_invoice_by_token(db, token)
    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found or not available for verification",
        )

    currency_code = "LSL"
    if invoice.currency is not None:
        currency_code = invoice.currency.code

    company_setting = setting_service.get_tenant_setting(
        db, invoice.tenant_id, "company_name"
    )
    company_name = company_setting.value if company_setting else None

    return PublicInvoiceVerifyResponse(
        invoice_number=invoice.invoice_number,
        issue_date=invoice.issue_date,
        total=invoice.total,
        currency_code=currency_code,
        status_code=invoice.status_code or "unknown",
        status_name=invoice.status_name or "Unknown",
        company_name=company_name,
        verified_at=datetime.now(timezone.utc),
    )
