"""Payment routes - record, list, delete payments for invoices."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.core.payment_methods import list_payment_methods
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentMethodInfo, PaymentResponse
from app.services import payment_service


router = APIRouter(tags=["payments"])


@router.get("/payment-methods", response_model=list[PaymentMethodInfo])
def list_methods(_: User = Depends(get_current_user)) -> list[PaymentMethodInfo]:
    """Return the list of allowed payment methods."""
    return [PaymentMethodInfo(**m) for m in list_payment_methods()]


@router.get("/invoices/{invoice_id}/payments", response_model=list[PaymentResponse])
def list_payments(
    invoice_id: UUID,
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[Payment]:
    return payment_service.list_payments_for_invoice(db, current_user.tenant_id, invoice_id)


@router.post(
    "/invoices/{invoice_id}/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_payment(
    invoice_id: UUID,
    payload: PaymentCreate,
    current_user: User = Depends(require_permission("invoice.update")),
    db: Session = Depends(get_db),
) -> Payment:
    try:
        return payment_service.record_payment(db, current_user.tenant_id, current_user.id, invoice_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: UUID,
    current_user: User = Depends(require_permission("invoice.delete")),
    db: Session = Depends(get_db),
) -> None:
    deleted = payment_service.delete_payment(db, current_user.tenant_id, current_user.id, payment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Payment not found")

