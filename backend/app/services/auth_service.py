"""Authentication service - business logic for login and token management."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.tenant import Tenant
from app.models.user import User


class AuthError(Exception):
    """Authentication-related error."""

    def __init__(self, message: str = "Authentication failed") -> None:
        self.message = message
        super().__init__(message)


def get_user_by_email(db: Session, email: str) -> User | None:
    """Find a user by email (case-insensitive)."""
    stmt = select(User).where(User.email == email.lower())
    return db.execute(stmt).scalar_one_or_none()

def get_user_by_email_in_tenant(db: Session, tenant_id: UUID, email: str) -> User | None:
    """Find a user by email within a specific tenant (case-insensitive).

    Use this instead of get_user_by_email when the query must be scoped to
    one tenant. get_user_by_email remains the global lookup used at login
    and at user-creation time.
    """
    stmt = select(User).where(
        User.tenant_id == tenant_id,
        User.email == email.lower(),
    )
    return db.execute(stmt).scalar_one_or_none()


def get_tenant_by_id(db: Session, tenant_id: UUID) -> Tenant | None:
    """Find a tenant by ID."""
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    """Find a user by ID."""
    stmt = select(User).where(User.id == user_id)
    return db.execute(stmt).scalar_one_or_none()


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Validate credentials and return the user. Raises AuthError on failure."""
    user = get_user_by_email(db, email)
    if not user:
        raise AuthError("Invalid email or password")
    if not user.is_active:
        raise AuthError("Account is disabled")
    if not verify_password(password, user.hashed_password):
        raise AuthError("Invalid email or password")
    return user


def build_token_pair(user: User) -> tuple[str, str]:
    """Generate an access token and refresh token for a user."""
    access = create_access_token(subject=str(user.id), tenant_id=str(user.tenant_id))
    refresh = create_refresh_token(subject=str(user.id), tenant_id=str(user.tenant_id))
    return access, refresh


def refresh_access_token(db: Session, refresh_token: str) -> str:
    """Validate a refresh token and issue a new access token."""
    payload = decode_token(refresh_token)
    if not payload:
        raise AuthError("Invalid refresh token")
    if payload.get("type") != "refresh":
        raise AuthError("Token is not a refresh token")
    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("Invalid token payload")
    user = get_user_by_id(db, UUID(user_id))
    if not user:
        raise AuthError("User no longer exists")
    if not user.is_active:
        raise AuthError("Account is disabled")
    return create_access_token(subject=str(user.id), tenant_id=str(user.tenant_id))


def create_user(
    db: Session,
    tenant_id: UUID,
    email: str,
    password: str,
    first_name: str | None = None,
    last_name: str | None = None,
    is_superuser: bool = False,
) -> User:
    """Create a new user (used in seeding and admin flows)."""
    existing = get_user_by_email(db, email)
    if existing:
        raise AuthError("Email already registered")
    user = User(
        tenant_id=tenant_id,
        email=email.lower(),
        hashed_password=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        is_superuser=is_superuser,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

