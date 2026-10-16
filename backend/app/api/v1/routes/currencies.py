"""Currency routes."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.models.currency import Currency
from app.models.user import User
from app.schemas.currency import CurrencyCreate, CurrencyResponse, CurrencyUpdate
from app.services import currency_service


router = APIRouter(prefix="/currencies", tags=["currencies"])


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superuser access."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


@router.get("/", response_model=list[CurrencyResponse])
def list_currencies(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Currency]:
    return currency_service.list_currencies(db, only_active=False)


@router.get("/{currency_id}", response_model=CurrencyResponse)
def get_currency(
    currency_id: UUID,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> Currency:
    currency = currency_service.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    return currency


@router.post("/", response_model=CurrencyResponse, status_code=status.HTTP_201_CREATED)
def create_currency(
    payload: CurrencyCreate,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> Currency:
    try:
        return currency_service.create_currency(
            db,
            code=payload.code,
            name=payload.name,
            symbol=payload.symbol,
            decimal_places=payload.decimal_places,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("/{currency_id}", response_model=CurrencyResponse)
def update_currency(
    currency_id: UUID,
    payload: CurrencyUpdate,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> Currency:
    currency = currency_service.update_currency(
        db,
        currency_id,
        name=payload.name,
        symbol=payload.symbol,
        decimal_places=payload.decimal_places,
        is_active=payload.is_active,
    )
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    return currency


@router.delete("/{currency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_currency(
    currency_id: UUID,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> None:
    success = currency_service.delete_currency(db, currency_id)
    if not success:
        raise HTTPException(status_code=404, detail="Currency not found")

