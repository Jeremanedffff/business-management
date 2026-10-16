"""Permission enforcement dependency."""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.models.user import User
from app.services.permission_service import get_user_permission_codes


def require_permission(permission_code: str):
    # Factory that returns a dependency enforcing a specific permission.
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if current_user.is_superuser:
            return current_user

        codes = get_user_permission_codes(db, current_user.id)
        if permission_code not in codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission_code}",
            )

        return current_user

    return dependency

