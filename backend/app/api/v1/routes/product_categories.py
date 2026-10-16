"""Product category routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.product_category import ProductCategory
from app.models.user import User
from app.schemas.product_category import (
    ProductCategoryCreate,
    ProductCategoryResponse,
    ProductCategoryUpdate,
)
from app.services import product_category_service


router = APIRouter(prefix="/product-categories", tags=["product_categories"])


@router.get("/", response_model=list[ProductCategoryResponse])
def list_categories(
    current_user: User = Depends(require_permission("product.view")),
    db: Session = Depends(get_db),
) -> list[ProductCategory]:
    return product_category_service.list_categories(db, current_user.tenant_id)


@router.post("/", response_model=ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: ProductCategoryCreate,
    current_user: User = Depends(require_permission("product.create")),
    db: Session = Depends(get_db),
) -> ProductCategory:
    try:
        return product_category_service.create_category(db, current_user.tenant_id, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{category_id}", response_model=ProductCategoryResponse)
def get_category(
    category_id: UUID,
    current_user: User = Depends(require_permission("product.view")),
    db: Session = Depends(get_db),
) -> ProductCategory:
    category = product_category_service.get_category(db, current_user.tenant_id, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.patch("/{category_id}", response_model=ProductCategoryResponse)
def update_category(
    category_id: UUID,
    payload: ProductCategoryUpdate,
    current_user: User = Depends(require_permission("product.update")),
    db: Session = Depends(get_db),
) -> ProductCategory:
    category = product_category_service.update_category(
        db, current_user.tenant_id, current_user.id, category_id, payload
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    current_user: User = Depends(require_permission("product.delete")),
    db: Session = Depends(get_db),
) -> None:
    deleted = product_category_service.delete_category(
        db, current_user.tenant_id, current_user.id, category_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Category not found")

