"""Fiscal period routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.fiscal_period import FiscalPeriod
from app.models.user import User
from app.schemas.fiscal_period import (
    FiscalPeriodCreate,
    FiscalPeriodResponse,
    FiscalPeriodStatusInfo,
    FiscalPeriodUpdate,
)
from app.services import fiscal_period_service
from app.services.fiscal_period_service import FiscalPeriodError


router = APIRouter(prefix="/fiscal-periods", tags=["fiscal-periods"])


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[FiscalPeriodResponse])
def list_periods(
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> list[FiscalPeriod]:
    return fiscal_period_service.list_periods(db, current_user.tenant_id)


@router.post("/", response_model=FiscalPeriodResponse, status_code=status.HTTP_201_CREATED)
def create_period(
    payload: FiscalPeriodCreate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> FiscalPeriod:
    try:
        return fiscal_period_service.create_period(db, current_user.tenant_id, payload)
    except FiscalPeriodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


@router.patch("/{period_id}", response_model=FiscalPeriodResponse)
def update_period(
    period_id: UUID,
    payload: FiscalPeriodUpdate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> FiscalPeriod:
    try:
        return fiscal_period_service.update_period(
            db, current_user.tenant_id, period_id, payload
        )
    except FiscalPeriodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


@router.delete("/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_period(
    period_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> None:
    try:
        fiscal_period_service.delete_period(db, current_user.tenant_id, period_id)
    except FiscalPeriodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


@router.post("/{period_id}/open", response_model=FiscalPeriodResponse)
def open_period(
    period_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> FiscalPeriod:
    try:
        return fiscal_period_service.open_period(
            db, current_user.tenant_id, current_user.id, period_id
        )
    except FiscalPeriodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


@router.post("/{period_id}/close", response_model=FiscalPeriodResponse)
def close_period(
    period_id: UUID,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> FiscalPeriod:
    try:
        return fiscal_period_service.close_period(
            db, current_user.tenant_id, current_user.id, period_id
        )
    except FiscalPeriodError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc


# ---------------------------------------------------------------------------
# Any authenticated user - used by invoice screens
# ---------------------------------------------------------------------------


@router.get("/status", response_model=FiscalPeriodStatusInfo)
def get_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FiscalPeriodStatusInfo:
    return fiscal_period_service.get_status_info(db, current_user.tenant_id)