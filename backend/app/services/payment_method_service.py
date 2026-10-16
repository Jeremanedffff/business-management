"""Payment method service - per-tenant payment methods shown on invoices."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment_method import PAYMENT_METHOD_TYPES, PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate


class PaymentMethodError(Exception):
    """Domain error for payment method operations."""

    def __init__(self, message: str = "Payment method error") -> None:
        self.message = message
        super().__init__(message)


def get_types_info() -> list[dict]:
    """Return the master list of supported payment method types."""
    return [
        {"type": key, "label": spec["label"], "fields": list(spec["fields"])}
        for key, spec in PAYMENT_METHOD_TYPES.items()
    ]


def _validate_type(method_type: str) -> None:
    if method_type not in PAYMENT_METHOD_TYPES:
        raise PaymentMethodError(
            f"Unknown payment method type: {method_type}. "
            f"Valid types: {', '.join(PAYMENT_METHOD_TYPES.keys())}"
        )


def _clear_preferred(db: Session, tenant_id: UUID, except_id: UUID | None = None) -> None:
    """Set is_preferred=False on all methods of this tenant (optionally except one)."""
    stmt = select(PaymentMethod).where(PaymentMethod.tenant_id == tenant_id)
    if except_id is not None:
        stmt = stmt.where(PaymentMethod.id != except_id)
    for m in db.execute(stmt).scalars().all():
        if m.is_preferred:
            m.is_preferred = False


def list_payment_methods(db: Session, tenant_id: UUID) -> list[PaymentMethod]:
    """All methods for this tenant (active + inactive), ordered for admin view."""
    stmt = (
        select(PaymentMethod)
        .where(PaymentMethod.tenant_id == tenant_id)
        .order_by(PaymentMethod.is_preferred.desc(), PaymentMethod.sort_order, PaymentMethod.display_name)
    )
    return list(db.execute(stmt).scalars().all())


def list_active_payment_methods(db: Session, tenant_id: UUID) -> list[PaymentMethod]:
    """Active methods only, ordered for invoice display (preferred first)."""
    stmt = (
        select(PaymentMethod)
        .where(
            PaymentMethod.tenant_id == tenant_id,
            PaymentMethod.is_active.is_(True),
        )
        .order_by(PaymentMethod.is_preferred.desc(), PaymentMethod.sort_order, PaymentMethod.display_name)
    )
    return list(db.execute(stmt).scalars().all())


def get_payment_method(db: Session, tenant_id: UUID, method_id: UUID) -> PaymentMethod | None:
    stmt = select(PaymentMethod).where(
        PaymentMethod.tenant_id == tenant_id,
        PaymentMethod.id == method_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def create_payment_method(
    db: Session, tenant_id: UUID, payload: PaymentMethodCreate
) -> PaymentMethod:
    _validate_type(payload.type)

    # If this one is preferred, clear any existing preferred
    if payload.is_preferred:
        _clear_preferred(db, tenant_id)

    method = PaymentMethod(
        tenant_id=tenant_id,
        type=payload.type,
        display_name=payload.display_name,
        details=payload.details or {},
        is_preferred=payload.is_preferred,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(method)
    db.commit()
    db.refresh(method)
    return method


def update_payment_method(
    db: Session, tenant_id: UUID, method_id: UUID, payload: PaymentMethodUpdate
) -> PaymentMethod:
    method = get_payment_method(db, tenant_id, method_id)
    if method is None:
        raise PaymentMethodError("Payment method not found.")

    update_data = payload.model_dump(exclude_unset=True)

    # Handle preferred flip carefully
    if update_data.get("is_preferred") is True:
        _clear_preferred(db, tenant_id, except_id=method_id)

    for field, value in update_data.items():
        setattr(method, field, value)

    db.commit()
    db.refresh(method)
    return method


def deactivate_payment_method(db: Session, tenant_id: UUID, method_id: UUID) -> None:
    method = get_payment_method(db, tenant_id, method_id)
    if method is None:
        raise PaymentMethodError("Payment method not found.")

    was_preferred = method.is_preferred
    method.is_active = False
    method.is_preferred = False

    # If it was the preferred one, promote another active method (if any)
    if was_preferred:
        stmt = (
            select(PaymentMethod)
            .where(
                PaymentMethod.tenant_id == tenant_id,
                PaymentMethod.is_active.is_(True),
                PaymentMethod.id != method_id,
            )
            .order_by(PaymentMethod.sort_order, PaymentMethod.display_name)
            .limit(1)
        )
        replacement = db.execute(stmt).scalar_one_or_none()
        if replacement is not None:
            replacement.is_preferred = True

    db.commit()


def set_preferred(db: Session, tenant_id: UUID, method_id: UUID) -> PaymentMethod:
    method = get_payment_method(db, tenant_id, method_id)
    if method is None:
        raise PaymentMethodError("Payment method not found.")
    if not method.is_active:
        raise PaymentMethodError("Cannot mark an inactive payment method as preferred.")

    _clear_preferred(db, tenant_id, except_id=method_id)
    method.is_preferred = True
    db.commit()
    db.refresh(method)
    return method