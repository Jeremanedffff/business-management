"""ProductCategory service."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product_category import ProductCategory
from app.schemas.product_category import ProductCategoryCreate, ProductCategoryUpdate
from app.services import audit_service

PRODUCT_CATEGORY_AUDIT_FIELDS = [
    "code", "name", "description", "default_tax_rate_id",
    "sort_order", "is_active",
]


def list_categories(db: Session, tenant_id: UUID, only_active: bool = True) -> list[ProductCategory]:
    stmt = select(ProductCategory).where(ProductCategory.tenant_id == tenant_id)
    if only_active:
        stmt = stmt.where(ProductCategory.is_active.is_(True))
    stmt = stmt.order_by(ProductCategory.sort_order, ProductCategory.name)
    return list(db.execute(stmt).scalars().all())


def get_category(db: Session, tenant_id: UUID, category_id: UUID) -> ProductCategory | None:
    stmt = select(ProductCategory).where(
        ProductCategory.tenant_id == tenant_id,
        ProductCategory.id == category_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_by_code(db: Session, tenant_id: UUID, code: str) -> ProductCategory | None:
    stmt = select(ProductCategory).where(
        ProductCategory.tenant_id == tenant_id,
        ProductCategory.code == code,
    )
    return db.execute(stmt).scalar_one_or_none()


def create_category(
    db: Session, tenant_id: UUID, user_id: UUID, payload: ProductCategoryCreate
) -> ProductCategory:
    existing = get_by_code(db, tenant_id, payload.code)
    if existing:
        raise ValueError(f"Category code already exists: {payload.code}")

    category = ProductCategory(
        tenant_id=tenant_id,
        code=payload.code,
        name=payload.name,
        description=payload.description,
        default_tax_rate_id=payload.default_tax_rate_id,
        sort_order=payload.sort_order,
    )
    db.add(category)
    db.flush()

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="product_category.created",
        entity_type="product_category",
        entity_id=category.id,
        new_values=audit_service.snapshot(category, PRODUCT_CATEGORY_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, tenant_id: UUID, user_id: UUID, category_id: UUID, payload: ProductCategoryUpdate
) -> ProductCategory | None:
    category = get_category(db, tenant_id, category_id)
    if category is None:
        return None
    old_snap = audit_service.snapshot(category, PRODUCT_CATEGORY_AUDIT_FIELDS)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="product_category.updated",
        entity_type="product_category",
        entity_id=category.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(category, PRODUCT_CATEGORY_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, tenant_id: UUID, user_id: UUID, category_id: UUID) -> bool:
    category = get_category(db, tenant_id, category_id)
    if category is None:
        return False
    old_snap = audit_service.snapshot(category, PRODUCT_CATEGORY_AUDIT_FIELDS)

    category.is_active = False

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="product_category.deactivated",
        entity_type="product_category",
        entity_id=category.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(category, PRODUCT_CATEGORY_AUDIT_FIELDS),
    )

    db.commit()
    return True

