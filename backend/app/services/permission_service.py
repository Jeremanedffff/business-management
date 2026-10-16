"""Permission service - load and check user permissions."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole


def get_user_permission_codes(db: Session, user_id: UUID) -> set[str]:
    """Return the set of permission codes granted to a user."""
    stmt = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user_id)
        .distinct()
    )
    rows = db.execute(stmt).scalars().all()
    return set(rows)


def user_has_permission(db: Session, user_id: UUID, permission_code: str) -> bool:
    """Check whether a user has a specific permission."""
    return permission_code in get_user_permission_codes(db, user_id)


def list_permissions(db: Session) -> list[Permission]:
    """List all permissions (superuser only)."""
    stmt = select(Permission).order_by(Permission.module, Permission.action)
    return list(db.execute(stmt).scalars().all())


def get_permission(db: Session, permission_id: UUID) -> Permission | None:
    return db.get(Permission, permission_id)


def get_permission_by_code(db: Session, code: str) -> Permission | None:
    stmt = select(Permission).where(Permission.code == code)
    return db.execute(stmt).scalar_one_or_none()


def create_permission(db: Session, code: str, module: str, action: str, description: str | None = None) -> Permission:
    existing = get_permission_by_code(db, code)
    if existing:
        raise ValueError(f"Permission with code '{code}' already exists")

    permission = Permission(code=code, module=module, action=action, description=description)
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission


def update_permission(db: Session, permission_id: UUID, code: str | None = None, module: str | None = None, action: str | None = None, description: str | None = None) -> Permission | None:
    permission = get_permission(db, permission_id)
    if not permission:
        return None

    if code is not None:
        existing = get_permission_by_code(db, code)
        if existing and existing.id != permission_id:
            raise ValueError(f"Permission with code '{code}' already exists")
        permission.code = code

    if module is not None:
        permission.module = module
    if action is not None:
        permission.action = action
    if description is not None:
        permission.description = description

    db.commit()
    db.refresh(permission)
    return permission


def delete_permission(db: Session, permission_id: UUID) -> bool:
    permission = get_permission(db, permission_id)
    if not permission:
        return False

    db.delete(permission)
    db.commit()
    return True

