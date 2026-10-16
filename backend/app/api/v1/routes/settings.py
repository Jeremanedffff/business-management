"""Settings routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.system_setting import SystemSetting
from app.models.tenant_setting import TenantSetting
from app.models.user import User
from app.schemas.setting import SettingResponse, SettingUpdate, TenantSettingCreate
from app.services import setting_service


router = APIRouter(prefix="/settings", tags=["settings"])


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superuser access."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


@router.get("/system", response_model=list[SettingResponse])
def list_system_settings(
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> list[SystemSetting]:
    return setting_service.list_system_settings(db)


@router.put("/system/{key}", response_model=SettingResponse)
def update_system_setting(
    key: str,
    payload: SettingUpdate,
    _: User = Depends(require_superuser),
    db: Session = Depends(get_db),
) -> SystemSetting:
    return setting_service.set_system_setting(db, key, payload.value)


@router.get("/tenant", response_model=list[SettingResponse])
def list_tenant_settings(
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> list[TenantSetting]:
    return setting_service.list_tenant_settings(db, current_user.tenant_id)


@router.post("/tenant", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
def create_tenant_setting(
    payload: TenantSettingCreate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> TenantSetting:
    try:
        return setting_service.create_tenant_setting(
            db,
            current_user.tenant_id,
            payload.key,
            payload.value,
            payload.description,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.put("/tenant/{key}", response_model=SettingResponse)
def update_tenant_setting(
    key: str,
    payload: SettingUpdate,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> TenantSetting:
    return setting_service.set_tenant_setting(db, current_user.tenant_id, key, payload.value)


@router.delete("/tenant/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant_setting(
    key: str,
    current_user: User = Depends(require_permission("setting.manage")),
    db: Session = Depends(get_db),
) -> None:
    success = setting_service.delete_tenant_setting(db, current_user.tenant_id, key)
    if not success:
        raise HTTPException(status_code=404, detail="Tenant setting not found")

