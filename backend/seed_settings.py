"""One-time script to seed default tenant settings."""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.tenant import Tenant
from app.services.setting_service import set_tenant_setting


DEFAULT_TENANT_SETTINGS = [
    ("company_name", "Demo Business"),
    ("company_email", "info@demobusiness.co.ls"),
    ("company_phone", "+266 1234 5678"),
    ("company_address", "Maseru, Lesotho"),
    ("company_tin", "1234567"),
    ("company_vat_number", "VAT123456"),
    ("invoice_prefix", "INV-"),
    ("invoice_next_number", "1"),
    ("invoice_terms", "Payment due within 30 days."),
    ("invoice_footer", "Thank you for your business!"),
    ("default_currency_code", "LSL"),
    ("default_tax_rate_code", "VAT15"),
    ("date_format", "YYYY-MM-DD"),
    ("timezone", "Africa/Maseru"),
]


def seed_settings() -> None:
    db = SessionLocal()
    try:
        tenant = db.execute(select(Tenant).where(Tenant.slug == "demo")).scalar_one_or_none()
        if not tenant:
            print("No demo tenant found. Run seed.py first.")
            return

        for key, value in DEFAULT_TENANT_SETTINGS:
            set_tenant_setting(db, tenant.id, key, value)
            print(f"  set {key} = {value}")

        print("Settings seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_settings()

