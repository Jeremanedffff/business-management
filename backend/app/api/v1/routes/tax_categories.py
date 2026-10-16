"""TaxCategory routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.tax_category import TaxCategory
from app.models.user import User
from app.schemas.tax_category import (
    TaxCategoryCreate,
    TaxCategoryResponse,
    TaxCategoryUpdate,
)
from app.services import tax_category_service


router = APIRouter(prefix="/tax-categories", tags=["tax_categories"])


@router.get("/", response_model=list[TaxCategoryResponse])
def list_categories(
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> list[TaxCategory]:
    return tax_category_service.list_categories(db, current_user.tenant_id)


@router.post(
    "/",
    response_model=TaxCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    payload: TaxCategoryCreate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> TaxCategory:
    try:
        return tax_category_service.create_category(
            db, current_user.tenant_id, current_user.id, payload
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.get("/{category_id}", response_model=TaxCategoryResponse)
def get_category(
    category_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> TaxCategory:
    category = tax_category_service.get_category(
        db, current_user.tenant_id, current_user.id, category_id
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.put("/{category_id}", response_model=TaxCategoryResponse)
def update_category(
    category_id: UUID,
    payload: TaxCategoryUpdate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> TaxCategory:
    category = tax_category_service.update_category(
        db, current_user.tenant_id, current_user.id, category_id, payload
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_category(
    category_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> None:
    success, in_use = tax_category_service.deactivate_category(
        db, current_user.tenant_id, current_user.id, category_id
    )
    if in_use > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot deactivate — {in_use} tax rate(s) still use this category. "
                "Reassign or remove those rates first."
            ),
        )
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
