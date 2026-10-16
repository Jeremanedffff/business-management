"""Custom application exceptions."""

from typing import Any


class AppError(Exception):
    """Base application error."""

    status_code: int = 500
    error_code: str = "internal_error"
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, details: Any = None) -> None:
        self.message = message or self.message
        self.details = details
        super().__init__(self.message)


class NotFoundError(AppError):
    """Resource not found."""

    status_code = 404
    error_code = "not_found"
    message = "Resource not found."


class ValidationError(AppError):
    """Business validation error (not Pydantic schema validation)."""

    status_code = 422
    error_code = "validation_error"
    message = "Validation failed."


class AuthenticationError(AppError):
    """Authentication failed."""

    status_code = 401
    error_code = "authentication_error"
    message = "Authentication required."


class PermissionDeniedError(AppError):
    """User lacks permission."""

    status_code = 403
    error_code = "permission_denied"
    message = "You do not have permission to perform this action."


class TenantAccessError(AppError):
    """Tenant isolation violation."""

    status_code = 403
    error_code = "tenant_access_denied"
    message = "Access to this resource is not permitted."


class ConflictError(AppError):
    """Conflict with existing data (e.g., duplicate)."""

    status_code = 409
    error_code = "conflict"
    message = "Conflict with existing data."

