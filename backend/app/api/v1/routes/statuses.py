"""Status routes."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.status import Status
from app.models.user import User
from app.schemas.status import StatusCreate, StatusResponse, StatusUpdate
from app.services import status_service


router = APIRouter(prefix="/statuses", tags=["statuses"])


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superuser access."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


@router.get("/", response_model=list[StatusResponse])
def list_statuses(
    entity_type: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Status]:
    if current_user.is_superuser:
        return status_service.list_all_statuses(db, entity_type=entity_type, only_active=False)
    return status_service.list_statuses(db, current_user.tenant_id, entity_type=entity_type)


@router.get("/all", response_model=list[StatusResponse])
def list_all_statuses_superuser(
    entity_type: str | None = Query(default=None),
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> list[Status]:
    """List all statuses across all tenants (superuser only)."""
    return status_service.list_all_statuses(db, entity_type=entity_type, only_active=False)


@router.get("/{status_id}", response_model=StatusResponse)
def get_status(
    status_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Status:
    status_obj = status_service.get_status(db, status_id)
    if not status_obj:
        raise HTTPException(status_code=404, detail="Status not found")
    if not current_user.is_superuser and status_obj.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return status_obj


@router.post("/", response_model=StatusResponse, status_code=status.HTTP_201_CREATED)
def create_status(
    payload: StatusCreate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> Status:
    try:
        return status_service.create_status(
            db,
            tenant_id=payload.tenant_id,
            entity_type=payload.entity_type,
            code=payload.code,
            name=payload.name,
            color=payload.color,
            sort_order=payload.sort_order,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("/{status_id}", response_model=StatusResponse)
def update_status(
    status_id: UUID,
    payload: StatusUpdate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> Status:
    status_obj = status_service.get_status(db, status_id)
    if not status_obj:
        raise HTTPException(status_code=404, detail="Status not found")
    if not current_user.is_superuser and status_obj.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        updated = status_service.update_status(
            db,
            status_id,
            code=payload.code,
            name=payload.name,
            color=payload.color,
            sort_order=payload.sort_order,
            is_active=payload.is_active,
        )
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_status(
    status_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> None:
    status_obj = status_service.get_status(db, status_id)
    if not status_obj:
        raise HTTPException(status_code=404, detail="Status not found")
    if not current_user.is_superuser and status_obj.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    success = status_service.delete_status(db, status_id)
    if not success:
        raise HTTPException(status_code=404, detail="Status not found")

