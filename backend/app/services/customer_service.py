"""Customer service - CRUD operations."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services import audit_service

CUSTOMER_AUDIT_FIELDS = [
    "code", "name", "trading_name", "tin", "vat_number",
    "email", "phone", "address", "customer_type", "is_active",
]


def _next_customer_code(db: Session, tenant_id: UUID) -> str:
    """Generate next customer code like CUS-0001."""
    count = db.execute(
        select(func.count()).select_from(Customer).where(Customer.tenant_id == tenant_id)
    ).scalar() or 0
    return f"CUS-{count + 1:04d}"


def list_customers(db: Session, tenant_id: UUID, only_active: bool = True) -> list[Customer]:
    stmt = select(Customer).where(Customer.tenant_id == tenant_id)
    if only_active:
        stmt = stmt.where(Customer.is_active.is_(True))
    stmt = stmt.order_by(Customer.name)
    return list(db.execute(stmt).scalars().all())


def get_customer(db: Session, tenant_id: UUID, customer_id: UUID) -> Customer | None:
    stmt = select(Customer).where(
        Customer.tenant_id == tenant_id,
        Customer.id == customer_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_customer_by_code(db: Session, tenant_id: UUID, code: str) -> Customer | None:
    stmt = select(Customer).where(
        Customer.tenant_id == tenant_id,
        Customer.code == code,
    )
    return db.execute(stmt).scalar_one_or_none()


def create_customer(db: Session, tenant_id: UUID, user_id: UUID, payload: CustomerCreate) -> Customer:
    code = payload.code or _next_customer_code(db, tenant_id)

    existing = get_customer_by_code(db, tenant_id, code)
    if existing:
        raise ValueError(f"Customer code already exists: {code}")

    customer = Customer(
        tenant_id=tenant_id,
        code=code,
        name=payload.name,
        trading_name=payload.trading_name,
        tin=payload.tin,
        vat_number=payload.vat_number,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        customer_type=payload.customer_type,
    )
    db.add(customer)
    db.flush()

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="customer.created",
        entity_type="customer",
        entity_id=customer.id,
        new_values=audit_service.snapshot(customer, CUSTOMER_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(customer)
    return customer


def update_customer(
    db: Session, tenant_id: UUID, user_id: UUID, customer_id: UUID, payload: CustomerUpdate
) -> Customer | None:
    customer = get_customer(db, tenant_id, customer_id)
    if customer is None:
        return None

    old_snap = audit_service.snapshot(customer, CUSTOMER_AUDIT_FIELDS)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="customer.updated",
        entity_type="customer",
        entity_id=customer.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(customer, CUSTOMER_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(db: Session, tenant_id: UUID, user_id: UUID, customer_id: UUID) -> bool:
    customer = get_customer(db, tenant_id, customer_id)
    if customer is None:
        return False
    old_snap = audit_service.snapshot(customer, CUSTOMER_AUDIT_FIELDS)

    customer.is_active = False

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="customer.deactivated",
        entity_type="customer",
        entity_id=customer.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(customer, CUSTOMER_AUDIT_FIELDS),
    )

    db.commit()
    return True

