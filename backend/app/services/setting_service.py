"""Setting service - system and tenant settings."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system_setting import SystemSetting
from app.models.tenant_setting import TenantSetting


def list_system_settings(db: Session) -> list[SystemSetting]:
    stmt = select(SystemSetting).order_by(SystemSetting.key)
    return list(db.execute(stmt).scalars().all())


def get_system_setting(db: Session, key: str) -> SystemSetting | None:
    stmt = select(SystemSetting).where(SystemSetting.key == key)
    return db.execute(stmt).scalar_one_or_none()


def set_system_setting(db: Session, key: str, value: str) -> SystemSetting:
    setting = get_system_setting(db, key)
    if setting is None:
        setting = SystemSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()
    db.refresh(setting)
    return setting


def list_tenant_settings(db: Session, tenant_id: UUID) -> list[TenantSetting]:
    stmt = select(TenantSetting).where(TenantSetting.tenant_id == tenant_id).order_by(TenantSetting.key)
    return list(db.execute(stmt).scalars().all())


def get_tenant_setting(db: Session, tenant_id: UUID, key: str) -> TenantSetting | None:
    stmt = select(TenantSetting).where(
        TenantSetting.tenant_id == tenant_id,
        TenantSetting.key == key,
    )
    return db.execute(stmt).scalar_one_or_none()


def set_tenant_setting(db: Session, tenant_id: UUID, key: str, value: str) -> TenantSetting:
    setting = get_tenant_setting(db, tenant_id, key)
    if setting is None:
        setting = TenantSetting(tenant_id=tenant_id, key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()
    db.refresh(setting)
    return setting


def create_tenant_setting(db: Session, tenant_id: UUID, key: str, value: str, description: str | None = None) -> TenantSetting:
    existing = get_tenant_setting(db, tenant_id, key)
    if existing:
        raise ValueError(f"Tenant setting with key '{key}' already exists")

    setting = TenantSetting(tenant_id=tenant_id, key=key, value=value, description=description)
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def delete_tenant_setting(db: Session, tenant_id: UUID, key: str) -> bool:
    setting = get_tenant_setting(db, tenant_id, key)
    if not setting:
        return False

    db.delete(setting)
    db.commit()
    return True

