"""Permission management routes (superuser only)."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.models.permission import Permission
from app.models.user import User
from app.schemas.permission import PermissionCreate, PermissionResponse, PermissionUpdate
from app.services import permission_service


router = APIRouter(prefix="/permissions", tags=["permissions"])


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superuser access."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


@router.get("/", response_model=list[PermissionResponse])
def list_permissions(
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> list[Permission]:
    return permission_service.list_permissions(db)


@router.get("/{permission_id}", response_model=PermissionResponse)
def get_permission(
    permission_id: UUID,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> Permission:
    permission = permission_service.get_permission(db, permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    return permission


@router.post("/", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
def create_permission(
    payload: PermissionCreate,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> Permission:
    try:
        return permission_service.create_permission(
            db,
            code=payload.code,
            module=payload.module,
            action=payload.action,
            description=payload.description,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("/{permission_id}", response_model=PermissionResponse)
def update_permission(
    permission_id: UUID,
    payload: PermissionUpdate,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> Permission:
    try:
        permission = permission_service.update_permission(
            db,
            permission_id,
            code=payload.code,
            module=payload.module,
            action=payload.action,
            description=payload.description,
        )
        if not permission:
            raise HTTPException(status_code=404, detail="Permission not found")
        return permission
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(
    permission_id: UUID,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> None:
    success = permission_service.delete_permission(db, permission_id)
    if not success:
        raise HTTPException(status_code=404, detail="Permission not found")
