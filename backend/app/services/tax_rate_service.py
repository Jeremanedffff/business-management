"""TaxRate service."""

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.tax_rate import TaxRate
from app.schemas.tax_rate import TaxRateCreate, TaxRateUpdate
from app.services import audit_service

TAX_RATE_AUDIT_FIELDS = [
    "code", "name", "description", "rate",
    "tax_type", "is_active", "is_default", "category_id",
]


def list_tax_rates(db: Session, tenant_id: UUID, only_active: bool = True) -> list[TaxRate]:
    stmt = select(TaxRate).where(TaxRate.tenant_id == tenant_id).order_by(TaxRate.code)
    if only_active:
        stmt = stmt.where(TaxRate.is_active.is_(True))
    return list(db.execute(stmt).scalars().all())


def get_tax_rate(db: Session, tenant_id: UUID, tax_rate_id: UUID) -> TaxRate | None:
    stmt = select(TaxRate).where(
        TaxRate.tenant_id == tenant_id,
        TaxRate.id == tax_rate_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def create_tax_rate(db: Session, tenant_id: UUID, user_id: UUID, payload: TaxRateCreate) -> TaxRate:
    tax_rate = TaxRate(
        tenant_id=tenant_id,
        code=payload.code,
        name=payload.name,
        description=payload.description,
        rate=payload.rate,
        tax_type=payload.tax_type,
        is_default=payload.is_default,
    )
    db.add(tax_rate)

    # If this new rate is the default, unset others first
    if payload.is_default:
        db.execute(
            update(TaxRate)
            .where(TaxRate.tenant_id == tenant_id, TaxRate.id != tax_rate.id)
            .values(is_default=False)
        )

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="tax_rate.created",
        entity_type="tax_rate",
        entity_id=tax_rate.id,
        new_values=audit_service.snapshot(tax_rate, TAX_RATE_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(tax_rate)
    return tax_rate


def update_tax_rate(
    db: Session, tenant_id: UUID, user_id: UUID, tax_rate_id: UUID, payload: TaxRateUpdate
) -> TaxRate | None:
    tax_rate = get_tax_rate(db, tenant_id, tax_rate_id)
    if tax_rate is None:
        return None

    old_snap = audit_service.snapshot(tax_rate, TAX_RATE_AUDIT_FIELDS)

    update_data = payload.model_dump(exclude_unset=True)

    # If this rate is being set as default, unset others first
    if update_data.get("is_default") is True:
        db.execute(
            update(TaxRate)
            .where(TaxRate.tenant_id == tenant_id, TaxRate.id != tax_rate_id)
            .values(is_default=False)
        )

    for field, value in update_data.items():
        setattr(tax_rate, field, value)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="tax_rate.updated",
        entity_type="tax_rate",
        entity_id=tax_rate.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(tax_rate, TAX_RATE_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(tax_rate)
    return tax_rate


def set_default_tax_rate(db: Session, tenant_id: UUID, user_id: UUID, tax_rate_id: UUID) -> TaxRate | None:
    tax_rate = get_tax_rate(db, tenant_id, tax_rate_id)
    if tax_rate is None:
        return None

    db.execute(
        update(TaxRate)
        .where(TaxRate.tenant_id == tenant_id, TaxRate.id != tax_rate_id)
        .values(is_default=False)
    )
    tax_rate.is_default = True

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="tax_rate.set_default",
        entity_type="tax_rate",
        entity_id=tax_rate.id,
        new_values=audit_service.snapshot(tax_rate, TAX_RATE_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(tax_rate)
    return tax_rate


def deactivate_tax_rate(db: Session, tenant_id: UUID, user_id: UUID, tax_rate_id: UUID) -> bool:
    tax_rate = get_tax_rate(db, tenant_id, tax_rate_id)
    if tax_rate is None:
        return False
    old_snap = audit_service.snapshot(tax_rate, TAX_RATE_AUDIT_FIELDS)

    tax_rate.is_active = False
    if tax_rate.is_default:
        tax_rate.is_default = False

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="tax_rate.deactivated",
        entity_type="tax_rate",
        entity_id=tax_rate.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(tax_rate, TAX_RATE_AUDIT_FIELDS),
    )

    db.commit()
    return True
