"""Product routes - full CRUD."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services import product_service


router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=list[ProductResponse])
def list_products(
    current_user: User = Depends(require_permission("product.view")),
    db: Session = Depends(get_db),
) -> list[Product]:
    return product_service.list_products(db, current_user.tenant_id)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_permission("product.create")),
    db: Session = Depends(get_db),
) -> Product:
    try:
        return product_service.create_product(db, current_user.tenant_id, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: UUID,
    current_user: User = Depends(require_permission("product.view")),
    db: Session = Depends(get_db),
) -> Product:
    product = product_service.get_product(db, current_user.tenant_id, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    current_user: User = Depends(require_permission("product.update")),
    db: Session = Depends(get_db),
) -> Product:
    product = product_service.update_product(db, current_user.tenant_id, current_user.id, product_id, payload)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    current_user: User = Depends(require_permission("product.delete")),
    db: Session = Depends(get_db),
) -> None:
    deleted = product_service.delete_product(db, current_user.tenant_id, current_user.id, product_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

