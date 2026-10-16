"""Role management routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user import User
from app.services import audit_service


router = APIRouter(prefix="/roles", tags=["roles"])

ROLE_AUDIT_FIELDS = ["name", "description", "is_system"]


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    description: str | None
    is_system: bool


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    permission_ids: list[UUID] = []


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    module: str
    action: str
    description: str | None


@router.get("/", response_model=list[RoleResponse])
def list_roles(
    current_user: User = Depends(require_permission("role.manage")),
    db: Session = Depends(get_db),
) -> list[Role]:
    stmt = select(Role).where(Role.tenant_id == current_user.tenant_id).order_by(Role.name)
    return list(db.execute(stmt).scalars().all())


@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    current_user: User = Depends(require_permission("role.manage")),
    db: Session = Depends(get_db),
) -> Role:
    existing = db.execute(
        select(Role).where(
            Role.tenant_id == current_user.tenant_id,
            Role.name == payload.name,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Role name already exists")

    role = Role(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        description=payload.description,
        is_system=False,
    )
    db.add(role)
    db.flush()

    for perm_id in payload.permission_ids:
        perm = db.execute(select(Permission).where(Permission.id == perm_id)).scalar_one_or_none()
        if perm:
            db.add(RolePermission(role_id=role.id, permission_id=perm_id))

    audit_service.log_action(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="role.created",
        entity_type="role",
        entity_id=role.id,
        new_values={
            **audit_service.snapshot(role, ROLE_AUDIT_FIELDS),
            "permission_count": len(payload.permission_ids),
        },
    )

    db.commit()
    db.refresh(role)
    return role


@router.get("/permissions", response_model=list[PermissionResponse])
def list_permissions(
    _: User = Depends(require_permission("role.manage")),
    db: Session = Depends(get_db),
) -> list[Permission]:
    stmt = select(Permission).order_by(Permission.module, Permission.action)
    return list(db.execute(stmt).scalars().all())


@router.get("/{role_id}/permissions", response_model=list[PermissionResponse])
def get_role_permissions(
    role_id: UUID,
    current_user: User = Depends(require_permission("role.manage")),
    db: Session = Depends(get_db),
) -> list[Permission]:
    stmt = (
        select(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role_id)
    )
    return list(db.execute(stmt).scalars().all())


@router.patch("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: UUID,
    payload: RoleCreate,
    current_user: User = Depends(require_permission("role.manage")),
    db: Session = Depends(get_db),
) -> Role:
    role = db.execute(
        select(Role).where(
            Role.id == role_id,
            Role.tenant_id == current_user.tenant_id,
        )
    ).scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot modify system roles")

    # Check for name conflict if name is being changed
    if payload.name != role.name:
        existing = db.execute(
            select(Role).where(
                Role.tenant_id == current_user.tenant_id,
                Role.name == payload.name,
                Role.id != role_id,
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Role name already exists")

    role.name = payload.name
    role.description = payload.description

    # Delete existing permissions
    db.execute(
        select(RolePermission).where(RolePermission.role_id == role_id)
    ).scalars().delete()

    # Add new permissions
    for perm_id in payload.permission_ids:
        perm = db.execute(select(Permission).where(Permission.id == perm_id)).scalar_one_or_none()
        if perm:
            db.add(RolePermission(role_id=role.id, permission_id=perm_id))

    audit_service.log_action(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="role.updated",
        entity_type="role",
        entity_id=role.id,
        new_values={
            **audit_service.snapshot(role, ROLE_AUDIT_FIELDS),
            "permission_count": len(payload.permission_ids),
        },
    )

    db.commit()
    db.refresh(role)
    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: UUID,
    current_user: User = Depends(require_permission("role.manage")),
    db: Session = Depends(get_db),
) -> None:
    role = db.execute(
        select(Role).where(
            Role.id == role_id,
            Role.tenant_id == current_user.tenant_id,
        )
    ).scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")

    # Check if role is assigned to any users
    from app.models.user_role import UserRole
    user_count = db.execute(
        select(func.count()).select_from(
            select(UserRole).where(UserRole.role_id == role_id).subquery()
        )
    ).scalar()

    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role assigned to {user_count} user(s)")

    audit_service.log_action(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="role.deleted",
        entity_type="role",
        entity_id=role.id,
        old_values=audit_service.snapshot(role, ROLE_AUDIT_FIELDS),
    )

    db.delete(role)
    db.commit()

