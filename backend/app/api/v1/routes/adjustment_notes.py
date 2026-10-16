"""Adjustment note routes - credit and debit notes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.adjustment_note import AdjustmentNote
from app.models.user import User
from app.schemas.adjustment_note import AdjustmentNoteCreate, AdjustmentNoteResponse
from app.services import adjustment_note_service


router = APIRouter(prefix="/adjustment-notes", tags=["adjustment_notes"])


@router.get("/", response_model=list[AdjustmentNoteResponse])
def list_notes(
    note_type: str | None = None,
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[AdjustmentNote]:
    return adjustment_note_service.list_notes(db, current_user.tenant_id, note_type=note_type)


@router.get("/for-invoice/{invoice_id}", response_model=list[AdjustmentNoteResponse])
def list_for_invoice(
    invoice_id: UUID,
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[AdjustmentNote]:
    return adjustment_note_service.list_notes_for_invoice(db, current_user.tenant_id, invoice_id)


@router.post("/", response_model=AdjustmentNoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: AdjustmentNoteCreate,
    current_user: User = Depends(require_permission("invoice.create")),
    db: Session = Depends(get_db),
) -> AdjustmentNote:
    try:
        return adjustment_note_service.create_note(db, current_user.tenant_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{note_id}", response_model=AdjustmentNoteResponse)
def get_note(
    note_id: UUID,
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> AdjustmentNote:
    note = adjustment_note_service.get_note(db, current_user.tenant_id, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Adjustment note not found")
    return note


@router.post("/{note_id}/cancel", response_model=AdjustmentNoteResponse)
def cancel_note(
    note_id: UUID,
    current_user: User = Depends(require_permission("invoice.delete")),
    db: Session = Depends(get_db),
) -> AdjustmentNote:
    try:
        return adjustment_note_service.cancel_note(db, current_user.tenant_id, note_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

