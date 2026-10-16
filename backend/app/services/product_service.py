"""Product service - CRUD operations."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services import audit_service

PRODUCT_AUDIT_FIELDS = [
    "code", "name", "description", "unit",
    "selling_price", "cost_price", "tax_rate_id",
    "item_type", "track_inventory", "is_active",
]


def _next_product_code(db: Session, tenant_id: UUID) -> str:
    count = db.execute(
        select(func.count()).select_from(Product).where(Product.tenant_id == tenant_id)
    ).scalar() or 0
    return f"PRD-{count + 1:04d}"


def list_products(db: Session, tenant_id: UUID, only_active: bool = True) -> list[Product]:
    stmt = select(Product).where(Product.tenant_id == tenant_id)
    if only_active:
        stmt = stmt.where(Product.is_active.is_(True))
    stmt = stmt.order_by(Product.name)
    return list(db.execute(stmt).scalars().all())


def get_product(db: Session, tenant_id: UUID, product_id: UUID) -> Product | None:
    stmt = select(Product).where(
        Product.tenant_id == tenant_id,
        Product.id == product_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_product_by_code(db: Session, tenant_id: UUID, code: str) -> Product | None:
    stmt = select(Product).where(
        Product.tenant_id == tenant_id,
        Product.code == code,
    )
    return db.execute(stmt).scalar_one_or_none()


def create_product(db: Session, tenant_id: UUID, user_id: UUID, payload: ProductCreate) -> Product:
    code = payload.code or _next_product_code(db, tenant_id)

    existing = get_product_by_code(db, tenant_id, code)
    if existing:
        raise ValueError(f"Product code already exists: {code}")

    product = Product(
        tenant_id=tenant_id,
        code=code,
        name=payload.name,
        description=payload.description,
        unit=payload.unit,
        selling_price=payload.selling_price,
        cost_price=payload.cost_price,
        tax_rate_id=payload.tax_rate_id,
        item_type=payload.item_type,
        track_inventory=payload.track_inventory,
    )
    db.add(product)
    db.flush()

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="product.created",
        entity_type="product",
        entity_id=product.id,
        new_values=audit_service.snapshot(product, PRODUCT_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(product)
    return product


def update_product(
    db: Session, tenant_id: UUID, user_id: UUID, product_id: UUID, payload: ProductUpdate
) -> Product | None:
    product = get_product(db, tenant_id, product_id)
    if product is None:
        return None
    old_snap = audit_service.snapshot(product, PRODUCT_AUDIT_FIELDS)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="product.updated",
        entity_type="product",
        entity_id=product.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(product, PRODUCT_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, tenant_id: UUID, user_id: UUID, product_id: UUID) -> bool:
    product = get_product(db, tenant_id, product_id)
    if product is None:
        return False
    old_snap = audit_service.snapshot(product, PRODUCT_AUDIT_FIELDS)

    product.is_active = False

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="product.deactivated",
        entity_type="product",
        entity_id=product.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(product, PRODUCT_AUDIT_FIELDS),
    )

    db.commit()
    return True

