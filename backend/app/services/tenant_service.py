"""Tenant service - business logic for tenant management (superuser only)."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.currency import Currency
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.status import Status
from app.models.tax_rate import TaxRate
from app.models.tenant import Tenant
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.tenant import TenantCreate, TenantCreateWithAdmin, TenantUpdate
from app.services.auth_service import AuthError, create_user


class TenantServiceError(Exception):
    """Tenant service error."""
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def list_tenants(db: Session) -> list[Tenant]:
    """List all tenants (superuser only)."""
    return db.execute(select(Tenant)).scalars().all()


def get_tenant(db: Session, tenant_id: UUID) -> Tenant | None:
    """Get a tenant by ID."""
    return db.get(Tenant, tenant_id)


def create_tenant(db: Session, payload: TenantCreate) -> Tenant:
    """Create a new tenant without admin (superuser only)."""
    # Check slug uniqueness
    existing = db.execute(select(Tenant).where(Tenant.slug == payload.slug)).scalar_one_or_none()
    if existing:
        raise TenantServiceError(f"Slug '{payload.slug}' is already taken")

    tenant = Tenant(**payload.model_dump())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Initialize default data for the tenant
    _initialize_tenant_defaults(db, tenant)

    return tenant


def create_tenant_with_admin(db: Session, payload: TenantCreateWithAdmin) -> Tenant:
    """Create a new tenant with its admin user (superuser only)."""
    # Check slug uniqueness
    existing = db.execute(select(Tenant).where(Tenant.slug == payload.slug)).scalar_one_or_none()
    if existing:
        raise TenantServiceError(f"Slug '{payload.slug}' is already taken")

    # Create tenant
    tenant_data = payload.model_dump(exclude={'admin_email', 'admin_password', 'admin_first_name', 'admin_last_name'})
    tenant = Tenant(**tenant_data)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Initialize default data for the tenant
    _initialize_tenant_defaults(db, tenant)

    # Create admin role for this tenant
    admin_role = Role(
        tenant_id=tenant.id,
        name="Administrator",
        description="Full access to this business",
        is_system=True
    )
    db.add(admin_role)
    db.commit()
    db.refresh(admin_role)

    # Assign all permissions to admin role
    all_perms = db.execute(select(Permission)).scalars().all()
    for perm in all_perms:
        db.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))
    db.commit()

    # Create admin user
    admin_user = create_user(
        db=db,
        tenant_id=tenant.id,
        email=payload.admin_email,
        password=payload.admin_password,
        first_name=payload.admin_first_name,
        last_name=payload.admin_last_name,
        is_superuser=False  # Business admin, not system superuser
    )

    # Assign admin role to the user
    db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
    db.commit()

    return tenant


def update_tenant(db: Session, tenant_id: UUID, payload: TenantUpdate) -> Tenant | None:
    """Update a tenant (superuser only)."""
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)
    return tenant


def delete_tenant(db: Session, tenant_id: UUID) -> bool:
    """Delete a tenant (superuser only)."""
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        return False

    db.delete(tenant)
    db.commit()
    return True


def _initialize_tenant_defaults(db: Session, tenant: Tenant) -> None:
    """Initialize default currencies, tax rates, and statuses for a new tenant."""

    # Default currencies
    for c in [
        {"code": "LSL", "name": "Lesotho Loti", "symbol": "M", "decimal_places": 2},
        {"code": "ZAR", "name": "South African Rand", "symbol": "R", "decimal_places": 2},
        {"code": "USD", "name": "US Dollar", "symbol": "$", "decimal_places": 2},
    ]:
        existing_cur = db.execute(select(Currency).where(Currency.code == c["code"])).scalar_one_or_none()
        if not existing_cur:
            db.add(Currency(**c))
    db.commit()

    # Default tax rates
    db.add(TaxRate(tenant_id=tenant.id, code="VAT15", name="VAT 15%", rate=0.15, tax_type="VAT"))
    db.add(TaxRate(tenant_id=tenant.id, code="VAT0", name="Zero Rated", rate=0.0, tax_type="ZERO_RATED"))
    db.add(TaxRate(tenant_id=tenant.id, code="EXEMPT", name="Exempt", rate=0.0, tax_type="EXEMPT"))
    db.commit()

    # Default invoice statuses
    for s in [
        {"code": "draft", "name": "Draft", "color": "gray", "sort_order": 10},
        {"code": "sent", "name": "Sent", "color": "blue", "sort_order": 20},
        {"code": "paid", "name": "Paid", "color": "green", "sort_order": 30},
        {"code": "overdue", "name": "Overdue", "color": "red", "sort_order": 40},
        {"code": "cancelled", "name": "Cancelled", "color": "gray", "sort_order": 50},
    ]:
        db.add(Status(tenant_id=tenant.id, entity_type="invoice", **s))
    db.commit()
