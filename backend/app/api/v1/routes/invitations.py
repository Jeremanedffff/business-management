"""Invitation routes - admin-managed invitations and public acceptance."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.user import User
from app.models.user_invitation import UserInvitation
from app.schemas.invitation import (
    InvitationAccept,
    InvitationCreate,
    InvitationPreview,
    InvitationResponse,
)
from app.schemas.auth import UserResponse
from app.services import invitation_service
from app.services.invitation_service import InvitationError


router = APIRouter(prefix="/invitations", tags=["invitations"])


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------


@router.post("/", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    payload: InvitationCreate,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> UserInvitation:
    try:
        invitation = invitation_service.create_invitation(
            db, current_user.tenant_id, current_user.id, payload
        )
    except InvitationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
    return invitation


@router.get("/", response_model=list[InvitationResponse])
def list_invitations(
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> list[UserInvitation]:
    stmt = (
        select(UserInvitation)
        .where(UserInvitation.tenant_id == current_user.tenant_id)
        .order_by(UserInvitation.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


@router.post("/{invitation_id}/resend", response_model=InvitationResponse)
def resend_invitation(
    invitation_id: UUID,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> UserInvitation:
    try:
        return invitation_service.resend_invitation(
            db, current_user.tenant_id, current_user.id, invitation_id
        )
    except InvitationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


@router.post("/{invitation_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(
    invitation_id: UUID,
    current_user: User = Depends(require_permission("user.manage")),
    db: Session = Depends(get_db),
) -> None:
    try:
        invitation_service.revoke_invitation(
            db, current_user.tenant_id, current_user.id, invitation_id
        )
    except InvitationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


# ---------------------------------------------------------------------------
# Public routes (no auth)
# ---------------------------------------------------------------------------


@router.get("/token/{token}", response_model=InvitationPreview)
def preview_invitation(token: str, db: Session = Depends(get_db)) -> InvitationPreview:
    try:
        data = invitation_service.get_invitation_preview(db, token)
    except InvitationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
    return InvitationPreview(**data)


@router.post("/accept", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def accept_invitation(
    payload: InvitationAccept,
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = invitation_service.accept_invitation(
            db, payload.token, payload.password, payload.confirm_password
        )
    except InvitationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
    return UserResponse.model_validate(user)