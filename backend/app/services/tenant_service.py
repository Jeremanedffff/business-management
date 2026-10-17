"""Tenant service - business logic for tenant management (superuser only)."""

import calendar
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.currency import Currency
from app.models.fiscal_period import FiscalPeriod
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.status import Status
from app.models.tax_rate import TaxRate
from app.models.tenant import Tenant
from app.models.tenant_setting import TenantSetting
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.tenant import TenantCreate, TenantCreateWithAdmin, TenantUpdate
from app.services.auth_service import AuthError, create_user, get_user_by_email


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
    try:
        _ensure_slug_available(db, payload.slug)
        tenant = Tenant(**payload.model_dump())
        db.add(tenant)
        db.flush()
        initialize_tenant_defaults(db, tenant)
        db.commit()
        db.refresh(tenant)
        return tenant
    except IntegrityError as exc:
        db.rollback()
        raise TenantServiceError("Business registration conflicts with existing data") from exc
    except Exception:
        db.rollback()
        raise


def create_tenant_with_admin(db: Session, payload: TenantCreateWithAdmin) -> Tenant:
    """Create a new tenant with its admin user (superuser only)."""
    try:
        _ensure_slug_available(db, payload.slug)
        if get_user_by_email(db, str(payload.admin_email)):
            raise TenantServiceError("Admin email is already registered")

        tenant_data = payload.model_dump(
            exclude={"admin_email", "admin_password", "admin_first_name", "admin_last_name"}
        )
        tenant = Tenant(**tenant_data)
        db.add(tenant)
        db.flush()

        initialize_tenant_defaults(db, tenant)

        admin_role = Role(
            tenant_id=tenant.id,
            name="Administrator",
            description="Full access to this business",
            is_system=True,
        )
        db.add(admin_role)
        db.flush()

        all_perms = db.execute(select(Permission)).scalars().all()
        if not all_perms:
            raise TenantServiceError("The permission catalog is not initialized")
        for perm in all_perms:
            db.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))

        admin_user = create_user(
            db=db,
            tenant_id=tenant.id,
            email=str(payload.admin_email),
            password=payload.admin_password,
            first_name=payload.admin_first_name,
            last_name=payload.admin_last_name,
            is_superuser=False,
            commit=False,
        )
        db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

        current_period = db.execute(
            select(FiscalPeriod).where(
                FiscalPeriod.tenant_id == tenant.id,
                FiscalPeriod.status == "open",
            )
        ).scalar_one()
        current_period.opened_by_user_id = admin_user.id

        db.commit()
        db.refresh(tenant)
        return tenant
    except AuthError as exc:
        db.rollback()
        raise TenantServiceError(exc.message) from exc
    except IntegrityError as exc:
        db.rollback()
        raise TenantServiceError("Business registration conflicts with existing data") from exc
    except Exception:
        db.rollback()
        raise


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


def _ensure_slug_available(db: Session, slug: str) -> None:
    existing = db.execute(select(Tenant).where(Tenant.slug == slug)).scalar_one_or_none()
    if existing:
        raise TenantServiceError(f"Slug '{slug}' is already taken")


def initialize_tenant_defaults(db: Session, tenant: Tenant) -> None:
    """Ensure a tenant has the baseline data required for invoicing."""
    # Default currencies
    for c in [
        {"code": "LSL", "name": "Lesotho Loti", "symbol": "M", "decimal_places": 2},
        {"code": "ZAR", "name": "South African Rand", "symbol": "R", "decimal_places": 2},
        {"code": "USD", "name": "US Dollar", "symbol": "$", "decimal_places": 2},
    ]:
        existing_cur = db.execute(select(Currency).where(Currency.code == c["code"])).scalar_one_or_none()
        if not existing_cur:
            db.add(Currency(**c))
    db.flush()

    # Default tax rates
    for tax in [
        {"code": "VAT15", "name": "VAT 15%", "rate": 0.15, "tax_type": "VAT"},
        {"code": "VAT0", "name": "Zero Rated", "rate": 0.0, "tax_type": "ZERO_RATED"},
        {"code": "EXEMPT", "name": "Exempt", "rate": 0.0, "tax_type": "EXEMPT"},
    ]:
        existing_tax = db.execute(
            select(TaxRate).where(
                TaxRate.tenant_id == tenant.id,
                TaxRate.code == tax["code"],
            )
        ).scalar_one_or_none()
        if existing_tax is None:
            db.add(TaxRate(tenant_id=tenant.id, **tax))

    # Default invoice statuses
    for s in [
        {"code": "draft", "name": "Draft", "color": "gray", "sort_order": 10},
        {"code": "approved", "name": "Approved", "color": "blue", "sort_order": 15},
        {"code": "sent", "name": "Sent", "color": "indigo", "sort_order": 20},
        {"code": "paid", "name": "Paid", "color": "green", "sort_order": 30},
        {"code": "overdue", "name": "Overdue", "color": "red", "sort_order": 40},
        {"code": "cancelled", "name": "Cancelled", "color": "gray", "sort_order": 50},
    ]:
        existing_status = db.execute(
            select(Status).where(
                Status.tenant_id == tenant.id,
                Status.entity_type == "invoice",
                Status.code == s["code"],
            )
        ).scalar_one_or_none()
        if existing_status is None:
            db.add(Status(tenant_id=tenant.id, entity_type="invoice", **s))

    for key, value, description in [
        ("invoice_prefix", "INV-", "Prefix used for this business's invoice numbers"),
        ("invoice_next_number", "1", "Next invoice number for this business"),
    ]:
        existing_setting = db.execute(
            select(TenantSetting).where(
                TenantSetting.tenant_id == tenant.id,
                TenantSetting.key == key,
            )
        ).scalar_one_or_none()
        if existing_setting is None:
            db.add(
                TenantSetting(
                    tenant_id=tenant.id,
                    key=key,
                    value=value,
                    description=description,
                )
            )

    today = date.today()
    period_start = today.replace(day=1)
    period_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
    period_name = f"{period_start.strftime('%B')} {period_start.year}"
    existing_period = db.execute(
        select(FiscalPeriod).where(
            FiscalPeriod.tenant_id == tenant.id,
            FiscalPeriod.name == period_name,
        )
    ).scalar_one_or_none()
    existing_open_period = db.execute(
        select(FiscalPeriod).where(
            FiscalPeriod.tenant_id == tenant.id,
            FiscalPeriod.status == "open",
        )
    ).scalars().first()
    if existing_period is None and existing_open_period is None:
        db.add(
            FiscalPeriod(
                tenant_id=tenant.id,
                name=period_name,
                start_date=period_start,
                end_date=period_end,
                status="open",
                opened_at=datetime.now(timezone.utc),
            )
        )
    db.flush()
