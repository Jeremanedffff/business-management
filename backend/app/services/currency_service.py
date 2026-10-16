"""Currency service."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.currency import Currency


def list_currencies(db: Session, only_active: bool = True) -> list[Currency]:
    stmt = select(Currency).order_by(Currency.code)
    if only_active:
        stmt = stmt.where(Currency.is_active.is_(True))
    return list(db.execute(stmt).scalars().all())


def get_currency(db: Session, currency_id: UUID) -> Currency | None:
    return db.get(Currency, currency_id)


def get_currency_by_code(db: Session, code: str) -> Currency | None:
    stmt = select(Currency).where(Currency.code == code)
    return db.execute(stmt).scalar_one_or_none()


def create_currency(db: Session, code: str, name: str, symbol: str, decimal_places: int = 2) -> Currency:
    existing = get_currency_by_code(db, code)
    if existing:
        raise ValueError(f"Currency with code '{code}' already exists")

    currency = Currency(code=code, name=name, symbol=symbol, decimal_places=decimal_places)
    db.add(currency)
    db.commit()
    db.refresh(currency)
    return currency


def update_currency(db: Session, currency_id: UUID, name: str | None = None, symbol: str | None = None, decimal_places: int | None = None, is_active: bool | None = None) -> Currency | None:
    currency = get_currency(db, currency_id)
    if not currency:
        return None

    if name is not None:
        currency.name = name
    if symbol is not None:
        currency.symbol = symbol
    if decimal_places is not None:
        currency.decimal_places = decimal_places
    if is_active is not None:
        currency.is_active = is_active

    db.commit()
    db.refresh(currency)
    return currency


def delete_currency(db: Session, currency_id: UUID) -> bool:
    currency = get_currency(db, currency_id)
    if not currency:
        return False

    db.delete(currency)
    db.commit()
    return True

