"""Invoice routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceDetailResponse,
    InvoiceResponse,
    InvoiceUpdate,
    PaymentSummary,
    StatusChangeRequest,
)
from app.services import adjustment_note_service, invoice_service


router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("/search", response_model=list[InvoiceResponse])
def search_invoices(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[Invoice]:
    """Search invoices by number, customer name, or reference."""
    if not q.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query cannot be blank",
        )
    return invoice_service.search_invoices(
        db, current_user.tenant_id, q, limit=limit, offset=offset
    )

@router.get("/", response_model=list[InvoiceResponse])
def list_invoices(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[Invoice]:
    return invoice_service.list_invoices(
        db, current_user.tenant_id, limit=limit, offset=offset
    )


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    current_user: User = Depends(require_permission("invoice.create")),
    db: Session = Depends(get_db),
) -> Invoice:
    try:
        return invoice_service.create_invoice(db, current_user.tenant_id, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> InvoiceDetailResponse:
    invoice = invoice_service.get_invoice(db, current_user.tenant_id, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payments = invoice_service.get_payments_for_invoice(db, current_user.tenant_id, invoice_id)
    adj = adjustment_note_service.get_adjustment_totals(db, current_user.tenant_id, invoice_id)
    returned_map = adjustment_note_service.get_returned_qty_map(db, current_user.tenant_id, invoice_id)

    base = InvoiceResponse.model_validate(invoice).model_dump()
        # Attach returned_qty to each item dynamically
    for item_dict in base["items"]:
        item_id = item_dict["id"]
        item_dict["returned_qty"] = str(returned_map.get(item_id, 0))


    return InvoiceDetailResponse(
        **base,
        payments=[PaymentSummary.model_validate(p) for p in payments],
        total_credits=adj["credits"],
        total_debits=adj["debits"],
    )


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: UUID,
    payload: InvoiceUpdate,
    current_user: User = Depends(require_permission("invoice.update")),
    db: Session = Depends(get_db),
) -> Invoice:
    try:
        return invoice_service.update_invoice(db, current_user.tenant_id, current_user.id, invoice_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{invoice_id}/status", response_model=InvoiceResponse)
def change_status(
    invoice_id: UUID,
    payload: StatusChangeRequest,
    current_user: User = Depends(require_permission("invoice.update")),
    db: Session = Depends(get_db),
) -> Invoice:
    try:
        return invoice_service.change_status(db, current_user.tenant_id, current_user.id, invoice_id, payload.status_code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice(
    invoice_id: UUID,
    current_user: User = Depends(require_permission("invoice.delete")),
    db: Session = Depends(get_db),
) -> Invoice:
    try:
        return invoice_service.cancel_invoice(db, current_user.tenant_id, current_user.id, invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

@router.post("/{invoice_id}/approve", response_model=InvoiceResponse)
def approve_invoice(
    invoice_id: UUID,
    current_user: User = Depends(require_permission("invoice.update")),
    db: Session = Depends(get_db),
) -> Invoice:
    try:
        return invoice_service.approve_invoice(db, current_user.tenant_id, current_user.id, invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
