"""Customer routes - full CRUD."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services import customer_service


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=list[CustomerResponse])
def list_customers(
    current_user: User = Depends(require_permission("customer.view")),
    db: Session = Depends(get_db),
) -> list[Customer]:
    return customer_service.list_customers(db, current_user.tenant_id)


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    current_user: User = Depends(require_permission("customer.create")),
    db: Session = Depends(get_db),
) -> Customer:
    try:
        return customer_service.create_customer(db, current_user.tenant_id, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: UUID,
    current_user: User = Depends(require_permission("customer.view")),
    db: Session = Depends(get_db),
) -> Customer:
    customer = customer_service.get_customer(db, current_user.tenant_id, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    current_user: User = Depends(require_permission("customer.update")),
    db: Session = Depends(get_db),
) -> Customer:
    customer = customer_service.update_customer(db, current_user.tenant_id, current_user.id, customer_id, payload)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: UUID,
    current_user: User = Depends(require_permission("customer.delete")),
    db: Session = Depends(get_db),
) -> None:
    deleted = customer_service.delete_customer(db, current_user.tenant_id, current_user.id, customer_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

