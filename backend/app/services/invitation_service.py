"""Invitation service - create, validate, accept, resend, revoke invitations."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.integrations.email import get_email_sender
from app.integrations.email import templates as email_templates
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.models.user_invitation import UserInvitation
from app.models.user_role import UserRole
from app.schemas.invitation import InvitationCreate
from app.services import audit_service
from app.services.auth_service import get_user_by_email_in_tenant

INVITATION_AUDIT_FIELDS = [
    "email", "first_name", "last_name", "role_id",
    "expires_at", "accepted_at", "revoked_at", "email_sent_at",
]

TOKEN_BYTES = 32  # -> ~43-char URL-safe string


class InvitationError(Exception):
    """Domain error for invitation operations."""

    def __init__(self, message: str = "Invitation error") -> None:
        self.message = message
        super().__init__(message)


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------


def _generate_raw_token() -> str:
    """Return a fresh, unpredictable invitation token (raw)."""
    return secrets.token_urlsafe(TOKEN_BYTES)


def _hash_token(raw_token: str) -> str:
    """Return a hex sha256 hash of the raw token.

    We store only the hash so a database leak cannot reveal live tokens.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Time helper
# ---------------------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _expires_at() -> datetime:
    settings = get_settings()
    return _now() + timedelta(hours=settings.invitation_expires_hours)


def _format_expiry_for_email(dt: datetime) -> str:
    """Format an expiry timestamp in Lesotho time (SAST, UTC+2) for the email."""
    sast = dt.astimezone(timezone.utc) + timedelta(hours=2)
    return sast.strftime("%Y-%m-%d %H:%M SAST")


# ---------------------------------------------------------------------------
# Link builder
# ---------------------------------------------------------------------------


def _build_registration_link(raw_token: str) -> str:
    settings = get_settings()
    base = settings.frontend_url.rstrip("/")
    return f"{base}/register/{raw_token}"


# ---------------------------------------------------------------------------
# Email send
# ---------------------------------------------------------------------------


def _send_invitation_email(
    *,
    to_email: str,
    user_name: str,
    company_name: str,
    role_name: str,
    raw_token: str,
    expires_at: datetime,
) -> bool:
    """Send the invitation email. Returns True if the provider accepted it."""
    sender = get_email_sender()
    link = _build_registration_link(raw_token)

    html = email_templates.invitation_html(
        user_name=user_name,
        company_name=company_name,
        role_name=role_name,
        invitation_link=link,
        expires_at=_format_expiry_for_email(expires_at),
    )
    text = email_templates.invitation_text(
        user_name=user_name,
        company_name=company_name,
        role_name=role_name,
        invitation_link=link,
        expires_at=_format_expiry_for_email(expires_at),
    )

    return sender.send(
        to=to_email,
        subject=email_templates.invitation_subject(),
        html=html,
        text=text,
        to_name=user_name,
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def create_invitation(
    db: Session,
    tenant_id: UUID,
    actor_user_id: UUID,
    payload: InvitationCreate,
) -> UserInvitation:
    """Create a new invitation and send the email. Commits on success.

    Raises InvitationError on validation failure.
    """
    email = payload.email.lower().strip()

    # Reject if a user with this email already exists in this tenant
    existing_user = get_user_by_email_in_tenant(db, tenant_id, email)
    if existing_user is not None:
        raise InvitationError("A user with this email already exists in your company.")

    # Reject if another pending invitation exists for the same email in this tenant
    existing_invitation = db.execute(
        select(UserInvitation).where(
            UserInvitation.tenant_id == tenant_id,
            UserInvitation.email == email,
            UserInvitation.accepted_at.is_(None),
            UserInvitation.revoked_at.is_(None),
        )
    ).scalar_one_or_none()
    if existing_invitation is not None:
        raise InvitationError(
            "An active invitation for this email already exists. "
            "Revoke it first or resend it instead."
        )

    # Validate role (must belong to the same tenant)
    role: Role | None = None
    if payload.role_id is not None:
        role = db.execute(
            select(Role).where(
                Role.tenant_id == tenant_id,
                Role.id == payload.role_id,
            )
        ).scalar_one_or_none()
        if role is None:
            raise InvitationError("Selected role not found in your company.")

    # Validate tenant exists (for company name in the email)
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise InvitationError("Company not found.")

    # Generate token + hash
    raw_token = _generate_raw_token()
    token_hash = _hash_token(raw_token)
    expires_at = _expires_at()

    invitation = UserInvitation(
        tenant_id=tenant_id,
        email=email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role_id=role.id if role else None,
        invited_by_user_id=actor_user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(invitation)
    db.flush()

    # Try to send the email first; record success/failure on the row
    email_sent = _send_invitation_email(
        to_email=email,
        user_name=(payload.first_name or email),
        company_name=tenant.name,
        role_name=(role.name if role else "User"),
        raw_token=raw_token,
        expires_at=expires_at,
    )
    if email_sent:
        invitation.email_sent_at = _now()

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=actor_user_id,
        action="invitation.created",
        entity_type="user_invitation",
        entity_id=invitation.id,
        new_values=audit_service.snapshot(invitation, INVITATION_AUDIT_FIELDS),
        notes=f"email_sent={email_sent}",
    )

    db.commit()
    db.refresh(invitation)

    if not email_sent:
        # Do not raise - the invitation exists; caller can offer a resend.
        # Signal the failure to the route layer via an attribute.
        setattr(invitation, "email_delivery_failed", True)

    return invitation


# ---------------------------------------------------------------------------
# Lookup (for preview + accept)
# ---------------------------------------------------------------------------


def _find_valid_invitation_by_token(
    db: Session, raw_token: str
) -> UserInvitation:
    """Return the invitation that matches raw_token and is currently valid.

    Raises InvitationError if no valid invitation is found.
    """
    token_hash = _hash_token(raw_token)
    invitation = db.execute(
        select(UserInvitation).where(UserInvitation.token_hash == token_hash)
    ).scalar_one_or_none()

    if invitation is None:
        raise InvitationError("This invitation link is not valid.")

    if invitation.revoked_at is not None:
        raise InvitationError("This invitation has been revoked.")

    if invitation.accepted_at is not None:
        raise InvitationError("This invitation has already been used.")

    if invitation.expires_at <= _now():
        raise InvitationError("This invitation has expired.")

    return invitation


def get_invitation_preview(db: Session, raw_token: str) -> dict:
    """Return safe preview data for the register page. Raises InvitationError."""
    invitation = _find_valid_invitation_by_token(db, raw_token)

    tenant = db.get(Tenant, invitation.tenant_id)
    tenant_name = tenant.name if tenant else "Unknown"

    role_name: str | None = None
    if invitation.role_id is not None:
        role = db.get(Role, invitation.role_id)
        role_name = role.name if role else None

    return {
        "email": invitation.email,
        "first_name": invitation.first_name,
        "last_name": invitation.last_name,
        "tenant_name": tenant_name,
        "role_name": role_name,
        "expires_at": invitation.expires_at,
    }


# ---------------------------------------------------------------------------
# Accept
# ---------------------------------------------------------------------------


def accept_invitation(
    db: Session,
    raw_token: str,
    password: str,
    confirm_password: str,
) -> User:
    """Complete registration. Creates user + assigns role in one transaction.

    Raises InvitationError on any validation failure.
    """
    if password != confirm_password:
        raise InvitationError("Passwords do not match.")

    # Basic password policy (mirrors the Pydantic min_length, adds letter+digit)
    if len(password) < 8:
        raise InvitationError("Password must be at least 8 characters.")
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise InvitationError("Password must contain at least one letter and one number.")

    invitation = _find_valid_invitation_by_token(db, raw_token)

    # Guard against a duplicate email that appeared between invite and accept
    existing_user = get_user_by_email_in_tenant(db, invitation.tenant_id, invitation.email)
    if existing_user is not None:
        raise InvitationError("An account already exists for this email.")

    # Validate role still exists (it may have been deleted)
    role: Role | None = None
    if invitation.role_id is not None:
        role = db.execute(
            select(Role).where(
                Role.tenant_id == invitation.tenant_id,
                Role.id == invitation.role_id,
            )
        ).scalar_one_or_none()

    # Create the user
    user = User(
        tenant_id=invitation.tenant_id,
        email=invitation.email,
        hashed_password=hash_password(password),
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        is_active=True,
        is_superuser=False,
    )
    db.add(user)
    db.flush()

    # Assign the role (if any)
    if role is not None:
        db.add(UserRole(user_id=user.id, role_id=role.id))

    # Mark invitation accepted
    invitation.accepted_at = _now()

    # Audit
    audit_service.log_action(
        db,
        tenant_id=invitation.tenant_id,
        user_id=user.id,
        action="invitation.accepted",
        entity_type="user_invitation",
        entity_id=invitation.id,
        new_values={
            "user_id": str(user.id),
            "email": user.email,
            "role_id": str(role.id) if role else None,
        },
    )

    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Resend
# ---------------------------------------------------------------------------


def resend_invitation(
    db: Session,
    tenant_id: UUID,
    actor_user_id: UUID,
    invitation_id: UUID,
) -> UserInvitation:
    """Revoke the old invitation, create a fresh one, send a new email."""
    old = db.execute(
        select(UserInvitation).where(
            UserInvitation.tenant_id == tenant_id,
            UserInvitation.id == invitation_id,
        )
    ).scalar_one_or_none()

    if old is None:
        raise InvitationError("Invitation not found.")

    if old.accepted_at is not None:
        raise InvitationError("This invitation has already been accepted.")

    if old.revoked_at is not None:
        raise InvitationError("This invitation has already been revoked.")

    # Revoke the old one
    old.revoked_at = _now()
    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=actor_user_id,
        action="invitation.revoked_for_resend",
        entity_type="user_invitation",
        entity_id=old.id,
    )

    # Create a fresh invitation with the same email/role/names
    raw_token = _generate_raw_token()
    token_hash = _hash_token(raw_token)
    expires_at = _expires_at()

    tenant = db.get(Tenant, tenant_id)
    tenant_name = tenant.name if tenant else "MalutiRecon"
    role_name = "User"
    if old.role_id is not None:
        role = db.get(Role, old.role_id)
        if role is not None:
            role_name = role.name

    new_invitation = UserInvitation(
        tenant_id=tenant_id,
        email=old.email,
        first_name=old.first_name,
        last_name=old.last_name,
        role_id=old.role_id,
        invited_by_user_id=actor_user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(new_invitation)
    db.flush()

    email_sent = _send_invitation_email(
        to_email=old.email,
        user_name=(old.first_name or old.email),
        company_name=tenant_name,
        role_name=role_name,
        raw_token=raw_token,
        expires_at=expires_at,
    )
    if email_sent:
        new_invitation.email_sent_at = _now()

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=actor_user_id,
        action="invitation.resent",
        entity_type="user_invitation",
        entity_id=new_invitation.id,
        notes=f"replaces={old.id} email_sent={email_sent}",
    )

    db.commit()
    db.refresh(new_invitation)

    if not email_sent:
        setattr(new_invitation, "email_delivery_failed", True)

    return new_invitation


# ---------------------------------------------------------------------------
# Revoke
# ---------------------------------------------------------------------------


def revoke_invitation(
    db: Session,
    tenant_id: UUID,
    actor_user_id: UUID,
    invitation_id: UUID,
) -> None:
    """Mark a pending invitation as revoked."""
    invitation = db.execute(
        select(UserInvitation).where(
            UserInvitation.tenant_id == tenant_id,
            UserInvitation.id == invitation_id,
        )
    ).scalar_one_or_none()

    if invitation is None:
        raise InvitationError("Invitation not found.")

    if invitation.accepted_at is not None:
        raise InvitationError("Cannot revoke an already accepted invitation.")

    if invitation.revoked_at is not None:
        return  # already revoked - no-op

    invitation.revoked_at = _now()

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=actor_user_id,
        action="invitation.revoked",
        entity_type="user_invitation",
        entity_id=invitation.id,
    )

    db.commit()