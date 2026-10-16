"""User management routes (admin)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.user import User
from app.schemas.user import (
    AssignRoleRequest,
    UserAdminResponse,
    UserCreateAdmin,
    UserUpdateAdmin,
    UserWithRoles,
)
from app.services import user_admin_service


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/all", response_model=list[UserAdminResponse])
def list_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[User]:
    """List all users across all tenants (superuser only)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superuser access required")
    return user_admin_service.list_all_users(db)


@router.get("/", response_model=list[UserAdminResponse])
def list_users(
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> list[User]:
    return user_admin_service.list_users(db, current_user.tenant_id)


@router.post("/", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    payload: UserCreateAdmin,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> User:
    try:
        return user_admin_service.create_tenant_user(db, current_user.tenant_id, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{user_id}", response_model=UserWithRoles)
def get_user(
    user_id: UUID,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> UserWithRoles:
    user = user_admin_service.get_user(db, current_user.tenant_id, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    role_ids = user_admin_service.get_user_role_ids(db, user_id)
    role_names = user_admin_service.get_user_role_names(db, user_id)
    return UserWithRoles(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        role_ids=role_ids,
        role_names=role_names,
    )


@router.patch("/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: UUID,
    payload: UserUpdateAdmin,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> User:
    user = user_admin_service.update_user(db, current_user.tenant_id, current_user.id, user_id, payload)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/roles", status_code=status.HTTP_204_NO_CONTENT)
def assign_role(
    user_id: UUID,
    payload: AssignRoleRequest,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> None:
    try:
        user_admin_service.assign_role(db, current_user.tenant_id, current_user.id, user_id, payload.role_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{user_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_role(
    user_id: UUID,
    role_id: UUID,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> None:
    try:
        user_admin_service.unassign_role(db, current_user.tenant_id, current_user.id, user_id, role_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

