"""Tenant management routes (superuser only)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.models.user import User
from app.schemas.tenant import (
    TenantCreate,
    TenantCreateWithAdmin,
    TenantResponse,
    TenantUpdate,
)
from app.services.tenant_service import (
    TenantServiceError,
    create_tenant,
    create_tenant_with_admin,
    delete_tenant,
    get_tenant,
    list_tenants,
    update_tenant,
)


router = APIRouter(prefix="/tenants", tags=["tenants"])


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superuser access."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


@router.get("/", response_model=list[TenantResponse])
def list_tenants_endpoint(
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> list:
    return list_tenants(db)


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant_endpoint(
    payload: TenantCreate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    try:
        return create_tenant(db, payload)
    except TenantServiceError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message) from exc


@router.post("/with-admin", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant_with_admin_endpoint(
    payload: TenantCreateWithAdmin,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Create a tenant with its business admin in one operation."""
    try:
        return create_tenant_with_admin(db, payload)
    except TenantServiceError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message) from exc


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant_endpoint(
    tenant_id: UUID,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    tenant = get_tenant(db, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant_endpoint(
    tenant_id: UUID,
    payload: TenantUpdate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    tenant = update_tenant(db, tenant_id, payload)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant_endpoint(
    tenant_id: UUID,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    success = delete_tenant(db, tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tenant not found")


@router.post("/{tenant_id}/activate", response_model=TenantResponse)
def activate_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    tenant = update_tenant(db, tenant_id, TenantUpdate(is_active=True))
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.post("/{tenant_id}/deactivate", response_model=TenantResponse)
def deactivate_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    tenant = update_tenant(db, tenant_id, TenantUpdate(is_active=False))
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant
