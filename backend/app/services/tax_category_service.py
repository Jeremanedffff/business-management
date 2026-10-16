"""TaxCategory service."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tax_category import TaxCategory
from app.models.tax_rate import TaxRate
from app.schemas.tax_category import TaxCategoryCreate, TaxCategoryUpdate
from app.services import audit_service

TAX_CATEGORY_AUDIT_FIELDS = [
    "code", "name", "description",
    "sort_order", "is_active",
]


def list_categories(
    db: Session, tenant_id: UUID, only_active: bool = False
) -> list[TaxCategory]:
    stmt = (
        select(TaxCategory)
        .where(TaxCategory.tenant_id == tenant_id)
        .order_by(TaxCategory.sort_order, TaxCategory.name)
    )
    if only_active:
        stmt = stmt.where(TaxCategory.is_active.is_(True))
    return list(db.execute(stmt).scalars().all())


def get_category(
    db: Session, tenant_id: UUID, category_id: UUID
) -> TaxCategory | None:
    stmt = select(TaxCategory).where(
        TaxCategory.tenant_id == tenant_id,
        TaxCategory.id == category_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_by_code(
    db: Session, tenant_id: UUID, code: str
) -> TaxCategory | None:
    stmt = select(TaxCategory).where(
        TaxCategory.tenant_id == tenant_id,
        TaxCategory.code == code,
    )
    return db.execute(stmt).scalar_one_or_none()


def count_rates_using(
    db: Session, tenant_id: UUID, category_id: UUID
) -> int:
    stmt = select(TaxRate).where(
        TaxRate.tenant_id == tenant_id,
        TaxRate.category_id == category_id,
    )
    return len(list(db.execute(stmt).scalars().all()))


def create_category(
    db: Session, tenant_id: UUID, user_id: UUID, payload: TaxCategoryCreate
) -> TaxCategory:
    existing = get_by_code(db, tenant_id, payload.code)
    if existing:
        raise ValueError(f"Category code already exists: {payload.code}")

    category = TaxCategory(
        tenant_id=tenant_id,
        code=payload.code,
        name=payload.name,
        description=payload.description,
        sort_order=payload.sort_order,
    )
    db.add(category)
    db.flush()

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="tax_category.created",
        entity_type="tax_category",
        entity_id=category.id,
        new_values=audit_service.snapshot(category, TAX_CATEGORY_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session,
    tenant_id: UUID,
    user_id: UUID,
    category_id: UUID,
    payload: TaxCategoryUpdate,
) -> TaxCategory | None:
    category = get_category(db, tenant_id, category_id)
    if category is None:
        return None
    old_snap = audit_service.snapshot(category, TAX_CATEGORY_AUDIT_FIELDS)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="tax_category.updated",
        entity_type="tax_category",
        entity_id=category.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(category, TAX_CATEGORY_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(category)
    return category


def deactivate_category(
    db: Session, tenant_id: UUID, user_id: UUID, category_id: UUID
) -> tuple[bool, int]:
    """
    Soft-delete a category.
    Returns (success, rates_in_use).
    If rates_in_use > 0, do NOT deactivate — caller should return 409.
    """
    category = get_category(db, tenant_id, category_id)
    if category is None:
        return False, 0

    in_use = count_rates_using(db, tenant_id, category_id)
    if in_use > 0:
        return False, in_use

    old_snap = audit_service.snapshot(category, TAX_CATEGORY_AUDIT_FIELDS)

    category.is_active = False

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="tax_category.deactivated",
        entity_type="tax_category",
        entity_id=category.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(category, TAX_CATEGORY_AUDIT_FIELDS),
    )

    db.commit()
    return True, 0
