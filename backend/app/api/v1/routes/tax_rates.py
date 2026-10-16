"""TaxRate routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.tax_rate import TaxRate
from app.models.user import User
from app.schemas.tax_rate import TaxRateCreate, TaxRateResponse, TaxRateUpdate
from app.services import tax_rate_service


router = APIRouter(prefix="/tax-rates", tags=["tax_rates"])


@router.get("/", response_model=list[TaxRateResponse])
def list_tax_rates(
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[TaxRate]:
    return tax_rate_service.list_tax_rates(db, current_user.tenant_id)


@router.post("/", response_model=TaxRateResponse, status_code=status.HTTP_201_CREATED)
def create_tax_rate(
    payload: TaxRateCreate,
    current_user: User = Depends(require_permission("invoice.create")),
    db: Session = Depends(get_db),
) -> TaxRate:
    try:
        return tax_rate_service.create_tax_rate(db, current_user.tenant_id, current_user.id, payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/{tax_rate_id}", response_model=TaxRateResponse)
def get_tax_rate(
    tax_rate_id: UUID,
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> TaxRate:
    tax_rate = tax_rate_service.get_tax_rate(db, current_user.tenant_id, tax_rate_id)
    if tax_rate is None:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    return tax_rate


@router.put("/{tax_rate_id}", response_model=TaxRateResponse)
def update_tax_rate(
    tax_rate_id: UUID,
    payload: TaxRateUpdate,
    current_user: User = Depends(require_permission("invoice.create")),
    db: Session = Depends(get_db),
) -> TaxRate:
    tax_rate = tax_rate_service.update_tax_rate(
        db, current_user.tenant_id, current_user.id, tax_rate_id, payload
    )
    if tax_rate is None:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    return tax_rate


@router.post("/{tax_rate_id}/set-default", response_model=TaxRateResponse)
def set_default_tax_rate(
    tax_rate_id: UUID,
    current_user: User = Depends(require_permission("invoice.create")),
    db: Session = Depends(get_db),
) -> TaxRate:
    tax_rate = tax_rate_service.set_default_tax_rate(
        db, current_user.tenant_id, current_user.id, tax_rate_id
    )
    if tax_rate is None:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    return tax_rate


@router.delete("/{tax_rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_tax_rate(
    tax_rate_id: UUID,
    current_user: User = Depends(require_permission("invoice.create")),
    db: Session = Depends(get_db),
) -> None:
    deleted = tax_rate_service.deactivate_tax_rate(
        db, current_user.tenant_id, current_user.id, tax_rate_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Tax rate not found")
