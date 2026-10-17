"""Payment method routes - tenant-managed payment methods."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.payment_method import PaymentMethod
from app.models.user import User
from app.schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentMethodTypeInfo,
    PaymentMethodUpdate,
)
from app.services import payment_method_service
from app.services.payment_method_service import PaymentMethodError


router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------


@router.get("/types", response_model=list[PaymentMethodTypeInfo])
def list_types(
    _: User = Depends(require_permission("setting.manage")),
) -> list[PaymentMethodTypeInfo]:
    """List all supported payment method types and their fields."""
    return [PaymentMethodTypeInfo(**t) for t in payment_method_service.get_types_info()]


@router.get("/", response_model=list[PaymentMethodResponse])
def list_methods(
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> list[PaymentMethod]:
    """List all payment methods for the current tenant (active + inactive)."""
    return payment_method_service.list_payment_methods(db, current_user.tenant_id)


@router.post("/", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
def create_method(
    payload: PaymentMethodCreate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> PaymentMethod:
    try:
        return payment_method_service.create_payment_method(db, current_user.tenant_id, payload)
    except PaymentMethodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


# ---------------------------------------------------------------------------
# Any authenticated user - used by the invoice display
# ---------------------------------------------------------------------------


@router.get("/active", response_model=list[PaymentMethodResponse])
def list_active(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PaymentMethod]:
    """Active payment methods for the current tenant - used on invoices."""
    return payment_method_service.list_active_payment_methods(db, current_user.tenant_id)


@router.get("/{method_id}", response_model=PaymentMethodResponse)
def get_method(
    method_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> PaymentMethod:
    method = payment_method_service.get_payment_method(db, current_user.tenant_id, method_id)
    if method is None:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return method


@router.patch("/{method_id}", response_model=PaymentMethodResponse)
def update_method(
    method_id: UUID,
    payload: PaymentMethodUpdate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> PaymentMethod:
    try:
        return payment_method_service.update_payment_method(
            db, current_user.tenant_id, method_id, payload
        )
    except PaymentMethodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


@router.post("/{method_id}/preferred", response_model=PaymentMethodResponse)
def set_preferred(
    method_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> PaymentMethod:
    try:
        return payment_method_service.set_preferred(db, current_user.tenant_id, method_id)
    except PaymentMethodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


@router.delete("/{method_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_method(
    method_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> None:
    try:
        payment_method_service.deactivate_payment_method(db, current_user.tenant_id, method_id)
    except PaymentMethodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
