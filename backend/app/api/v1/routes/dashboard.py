"""Dashboard routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.deps.auth import get_current_user
from app.api.v1.deps.database import get_db
from app.api.v1.deps.permissions import require_permission
from app.models.invoice import Invoice
from app.models.status import Status
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummary,
    RecentInvoice,
    RevenueByMonth,
    TopCustomer,
)
from app.services import dashboard_service


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> DashboardSummary:
    return DashboardSummary(**dashboard_service.get_summary(db, current_user.tenant_id))


@router.get("/recent-invoices", response_model=list[RecentInvoice])
def get_recent_invoices(
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[RecentInvoice]:
    data = dashboard_service.get_recent_invoices(db, current_user.tenant_id)
    return [RecentInvoice(**r) for r in data]


@router.get("/revenue-by-month", response_model=list[RevenueByMonth])
def get_revenue_by_month(
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[RevenueByMonth]:
    data = dashboard_service.get_revenue_by_month(db, current_user.tenant_id)
    return [RevenueByMonth(**r) for r in data]


@router.get("/top-customers", response_model=list[TopCustomer])
def get_top_customers(
    current_user: User = Depends(require_permission("invoice.view")),
    db: Session = Depends(get_db),
) -> list[TopCustomer]:
    data = dashboard_service.get_top_customers(db, current_user.tenant_id)
    return [TopCustomer(**r) for r in data]


@router.get("/system-stats")
def get_system_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get system-wide statistics (superuser only)."""
    if not current_user.is_superuser:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superuser access required")

    # Count total tenants
    total_tenants = db.execute(select(func.count(Tenant.id))).scalar()

    # Count active tenants
    active_tenants = db.execute(select(func.count(Tenant.id)).where(Tenant.is_active == True)).scalar()

    # Count total users
    total_users = db.execute(select(func.count(User.id))).scalar()

    # Count active users
    active_users = db.execute(select(func.count(User.id)).where(User.is_active == True)).scalar()

    # Count superusers
    total_superusers = db.execute(select(func.count(User.id)).where(User.is_superuser == True)).scalar()

    # Count total invoices
    total_invoices = db.execute(select(func.count(Invoice.id))).scalar()

    # Calculate total revenue across all tenants
    total_revenue = db.execute(select(func.coalesce(func.sum(Invoice.total), 0))).scalar()

    # Count invoices by status (join with Status table)
    paid_invoices = db.execute(
        select(func.count(Invoice.id))
        .join(Status, Invoice.status_id == Status.id)
        .where(Status.code == "paid")
    ).scalar()

    unpaid_invoices = db.execute(
        select(func.count(Invoice.id))
        .join(Status, Invoice.status_id == Status.id)
        .where(Status.code == "sent")
    ).scalar()

    return {
        "tenants": {
            "total": total_tenants,
            "active": active_tenants,
            "inactive": total_tenants - active_tenants,
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
            "superusers": total_superusers,
            "business_admins": total_users - total_superusers,
        },
        "invoices": {
            "total": total_invoices,
            "paid": paid_invoices,
            "unpaid": unpaid_invoices,
            "total_revenue": float(total_revenue),
        },
    }
