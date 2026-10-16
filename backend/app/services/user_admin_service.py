"""User admin service - manage users within a tenant."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.user import UserCreateAdmin, UserUpdateAdmin
from app.services.auth_service import create_user, get_user_by_email
from app.services import audit_service

USER_AUDIT_FIELDS = [
    "email", "first_name", "last_name", "is_active", "is_superuser",
]


def list_users(db: Session, tenant_id: UUID) -> list[User]:
    stmt = (
        select(User)
        .where(User.tenant_id == tenant_id)
        .order_by(User.email)
    )
    return list(db.execute(stmt).scalars().all())


def list_all_users(db: Session) -> list[User]:
    """List all users across all tenants (superuser only)."""
    from app.models.tenant import Tenant

    stmt = (
        select(User, Tenant.name.label("tenant_name"))
        .join(Tenant, User.tenant_id == Tenant.id)
        .order_by(User.email)
    )
    results = db.execute(stmt).all()

    users = []
    for user, tenant_name in results:
        user.tenant_name = tenant_name
        users.append(user)
    return users


def get_user(db: Session, tenant_id: UUID, user_id: UUID) -> User | None:
    stmt = select(User).where(
        User.tenant_id == tenant_id,
        User.id == user_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def create_tenant_user(db: Session, tenant_id: UUID, user_id: UUID, payload: UserCreateAdmin) -> User:
    existing = get_user_by_email(db, payload.email)
    if existing:
        raise ValueError(f"Email already registered: {payload.email}")

    created = create_user(
        db=db,
        tenant_id=tenant_id,
        email=payload.email,
        password=payload.password,
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_superuser=payload.is_superuser,
    )

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="user.created",
        entity_type="user",
        entity_id=created.id,
        new_values=audit_service.snapshot(created, USER_AUDIT_FIELDS),
    )
    db.commit()
    return created


def update_user(
    db: Session, tenant_id: UUID, actor_user_id: UUID, user_id: UUID, payload: UserUpdateAdmin
) -> User | None:
    user = get_user(db, tenant_id, user_id)
    if user is None:
        return None
    old_snap = audit_service.snapshot(user, USER_AUDIT_FIELDS)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=actor_user_id,
        action="user.updated",
        entity_type="user",
        entity_id=user.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(user, USER_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(user)
    return user


def get_user_role_ids(db: Session, user_id: UUID) -> list[UUID]:
    stmt = select(UserRole.role_id).where(UserRole.user_id == user_id)
    return list(db.execute(stmt).scalars().all())


def get_user_role_names(db: Session, user_id: UUID) -> list[str]:
    stmt = (
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return list(db.execute(stmt).scalars().all())


def assign_role(db: Session, tenant_id: UUID, actor_user_id: UUID, user_id: UUID, role_id: UUID) -> None:
    # Verify user belongs to tenant
    user = get_user(db, tenant_id, user_id)
    if user is None:
        raise ValueError("User not found")

    # Verify role belongs to tenant
    role = db.execute(
        select(Role).where(Role.tenant_id == tenant_id, Role.id == role_id)
    ).scalar_one_or_none()
    if role is None:
        raise ValueError("Role not found")

    # Check not already assigned
    existing = db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
        )
    ).scalar_one_or_none()
    if existing:
        return

    db.add(UserRole(user_id=user_id, role_id=role_id))

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=actor_user_id,
        action="user.role_assigned",
        entity_type="user",
        entity_id=user_id,
        new_values={"role_id": str(role_id), "role_name": role.name},
    )

    db.commit()


def unassign_role(db: Session, tenant_id: UUID, actor_user_id: UUID, user_id: UUID, role_id: UUID) -> None:
    user = get_user(db, tenant_id, user_id)
    if user is None:
        raise ValueError("User not found")

    link = db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
        )
    ).scalar_one_or_none()
    if link is None:
        return
    db.delete(link)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=actor_user_id,
        action="user.role_unassigned",
        entity_type="user",
        entity_id=user_id,
        old_values={"role_id": str(role_id)},
    )

    db.commit()

