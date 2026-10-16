"""Seed script - create initial tenant, roles, permissions, and users."""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.currency import Currency
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.status import Status
from app.models.tenant import Tenant
from app.models.tax_rate import TaxRate
from app.models.user import User
from app.models.user_role import UserRole
from app.services.auth_service import create_user, get_user_by_email


def seed() -> None:
    db = SessionLocal()
    try:
        # --- Tenant ---
        existing = db.execute(select(Tenant).where(Tenant.slug == "demo")).scalar_one_or_none()
        if existing:
            print(f"Tenant already exists: {existing.name} ({existing.id})")
            tenant = existing
        else:
            tenant = Tenant(
                name="Demo Business",
                slug="demo",
                legal_name="Demo Business (Pty) Ltd",
                trading_name="Demo Business",
                email="info@demobusiness.co.ls",
                phone="+266 1234 5678",
                address="Maseru, Lesotho",
                tin="1234567",
                vat_number="VAT123456",
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print(f"Created tenant: {tenant.name} ({tenant.id})")

        # --- Currencies ---
        for c in [
            {"code": "LSL", "name": "Lesotho Loti", "symbol": "M", "decimal_places": 2},
            {"code": "ZAR", "name": "South African Rand", "symbol": "R", "decimal_places": 2},
            {"code": "USD", "name": "US Dollar", "symbol": "$", "decimal_places": 2},
        ]:
            existing_cur = db.execute(select(Currency).where(Currency.code == c["code"])).scalar_one_or_none()
            if not existing_cur:
                db.add(Currency(**c))
        db.commit()

        # --- Tax Rates ---
        existing_tax = db.execute(select(TaxRate).where(TaxRate.tenant_id == tenant.id)).first()
        if not existing_tax:
            db.add(TaxRate(tenant_id=tenant.id, code="VAT15", name="VAT 15%", rate=0.15, tax_type="VAT"))
            db.add(TaxRate(tenant_id=tenant.id, code="VAT0", name="Zero Rated", rate=0.0, tax_type="ZERO_RATED"))
            db.add(TaxRate(tenant_id=tenant.id, code="EXEMPT", name="Exempt", rate=0.0, tax_type="EXEMPT"))
            db.commit()

        # --- Invoice Statuses ---
        existing_status = db.execute(select(Status).where(Status.tenant_id == tenant.id, Status.entity_type == "invoice")).first()
        if not existing_status:
            for s in [
                {"code": "draft", "name": "Draft", "color": "gray", "sort_order": 10},
                {"code": "sent", "name": "Sent", "color": "blue", "sort_order": 20},
                {"code": "paid", "name": "Paid", "color": "green", "sort_order": 30},
                {"code": "overdue", "name": "Overdue", "color": "red", "sort_order": 40},
                {"code": "cancelled", "name": "Cancelled", "color": "gray", "sort_order": 50},
            ]:
                db.add(Status(tenant_id=tenant.id, entity_type="invoice", **s))
            db.commit()

        # --- Permissions ---
        permission_specs = [
            ("customer.view", "customers", "view", "View customers"),
            ("customer.create", "customers", "create", "Create customers"),
            ("customer.update", "customers", "update", "Update customers"),
            ("customer.delete", "customers", "delete", "Delete customers"),
            ("product.view", "products", "view", "View products"),
            ("product.create", "products", "create", "Create products"),
            ("product.update", "products", "update", "Update products"),
            ("product.delete", "products", "delete", "Delete products"),
            ("invoice.view", "invoices", "view", "View invoices"),
            ("invoice.create", "invoices", "create", "Create invoices"),
            ("invoice.update", "invoices", "update", "Update invoices"),
            ("invoice.delete", "invoices", "delete", "Delete invoices"),
            ("invoice.approve", "invoices", "approve", "Approve invoices"),
            ("currency.manage", "currencies", "manage", "Manage currencies (superuser only)"),
            ("status.manage", "statuses", "manage", "Manage statuses"),
            ("tax.manage", "tax", "manage", "Manage tax rates and categories"),
            ("payment.manage", "payments", "manage", "Manage payment methods"),
            ("fiscal_period.manage", "fiscal_periods", "manage", "Manage fiscal periods"),
            ("setting.manage", "settings", "manage", "Manage system and tenant settings"),
            ("audit_log.view", "audit_logs", "view", "View audit logs"),
            ("role.manage", "roles", "manage", "Manage roles and permissions"),
            ("role.update", "roles", "update", "Update roles"),
            ("role.delete", "roles", "delete", "Delete roles"),
            ("user.manage", "users", "manage", "Manage users"),
        ]
        for code, module, action, description in permission_specs:
            existing_perm = db.execute(select(Permission).where(Permission.code == code)).scalar_one_or_none()
            if not existing_perm:
                db.add(Permission(code=code, module=module, action=action, description=description))
        db.commit()

        # --- Roles ---
        admin_role = db.execute(select(Role).where(Role.tenant_id == tenant.id, Role.name == "Administrator")).scalar_one_or_none()
        if not admin_role:
            admin_role = Role(tenant_id=tenant.id, name="Administrator", description="Full access", is_system=True)
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            all_perms = db.execute(select(Permission)).scalars().all()
            for perm in all_perms:
                db.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))
            db.commit()

        # --- Admin User ---
        admin_email = "admin@demobusiness.co.ls"
        admin_user = get_user_by_email(db, admin_email)
        if not admin_user:
            admin_user = create_user(db=db, tenant_id=tenant.id, email=admin_email, password="Admin123!", first_name="Demo", last_name="Admin", is_superuser=True)
            print(f"Created admin: {admin_email}")
        else:
            print(f"Admin already exists: {admin_email}")

        link = db.execute(select(UserRole).where(UserRole.user_id == admin_user.id, UserRole.role_id == admin_role.id)).scalar_one_or_none()
        if not link:
            db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
            db.commit()

        # --- Limited User (for RBAC testing) ---
        limited_email = "user@demobusiness.co.ls"
        limited_user = get_user_by_email(db, limited_email)
        if not limited_user:
            limited_user = create_user(db=db, tenant_id=tenant.id, email=limited_email, password="User123!", first_name="Limited", last_name="User", is_superuser=False)
            print(f"Created limited user: {limited_email} (no roles)")
        else:
            print(f"Limited user already exists: {limited_email}")

        print("")
        print("=" * 60)
        print("SEED COMPLETE")
        print("=" * 60)
        print(f"Tenant: {tenant.name}")
        print(f"Admin:    admin@demobusiness.co.ls / Admin123!")
        print(f"Limited:  user@demobusiness.co.ls / User123!")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed()

