"""Dashboard service - real-time statistics."""

from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.product import Product
from app.models.status import Status


def get_summary(db: Session, tenant_id: UUID) -> dict:
    """Return dashboard summary statistics for a tenant."""
    # --- Invoice counts ---
    total_invoices = db.execute(
        select(func.count()).select_from(Invoice).where(Invoice.tenant_id == tenant_id)
    ).scalar() or 0

    # --- Total revenue (sum of all invoice totals) ---
    total_revenue = db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(Invoice.tenant_id == tenant_id)
    ).scalar() or Decimal("0")

    # --- Amount paid ---
    total_paid = db.execute(
        select(func.coalesce(func.sum(Invoice.amount_paid), 0)).where(Invoice.tenant_id == tenant_id)
    ).scalar() or Decimal("0")

    # --- Outstanding ---
    outstanding = total_revenue - total_paid

    # --- Customers / Products ---
    total_customers = db.execute(
        select(func.count()).select_from(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.is_active.is_(True),
        )
    ).scalar() or 0

    total_products = db.execute(
        select(func.count()).select_from(Product).where(
            Product.tenant_id == tenant_id,
            Product.is_active.is_(True),
        )
    ).scalar() or 0

    # --- Invoice counts by status ---
    paid_status = db.execute(
        select(Status).where(
            Status.tenant_id == tenant_id,
            Status.entity_type == "invoice",
            Status.code == "paid",
        )
    ).scalar_one_or_none()

    paid_count = 0
    if paid_status:
        paid_count = db.execute(
            select(func.count()).select_from(Invoice).where(
                Invoice.tenant_id == tenant_id,
                Invoice.status_id == paid_status.id,
            )
        ).scalar() or 0

    return {
        "total_invoices": total_invoices,
        "total_revenue": str(total_revenue),
        "total_paid": str(total_paid),
        "outstanding": str(outstanding),
        "paid_count": paid_count,
        "unpaid_count": total_invoices - paid_count,
        "total_customers": total_customers,
        "total_products": total_products,
    }


def get_recent_invoices(db: Session, tenant_id: UUID, limit: int = 5) -> list[dict]:
    """Return the most recent invoices."""
    stmt = (
        select(Invoice)
        .where(Invoice.tenant_id == tenant_id)
        .order_by(Invoice.created_at.desc())
        .limit(limit)
    )
    invoices = db.execute(stmt).scalars().all()
    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "reference": inv.reference,
            "issue_date": inv.issue_date.isoformat(),
            "total": str(inv.total),
            "amount_paid": str(inv.amount_paid),
        }
        for inv in invoices
    ]


def get_revenue_by_month(db: Session, tenant_id: UUID, months: int = 6) -> list[dict]:
    """Return total revenue grouped by month for the last N months."""
    # Compute the start date (first day of the month N-1 months ago)
    today = date.today()
    start = date(today.year, today.month, 1)
    for _ in range(months - 1):
        # Go back one month
        if start.month == 1:
            start = date(start.year - 1, 12, 1)
        else:
            start = date(start.year, start.month - 1, 1)

    stmt = (
        select(
            func.to_char(Invoice.issue_date, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Invoice.total), 0).label("total"),
        )
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.issue_date >= start,
        )
        .group_by("month")
        .order_by("month")
    )
    rows = db.execute(stmt).all()
    return [{"month": row[0], "total": str(row[1])} for row in rows]


def get_top_customers(db: Session, tenant_id: UUID, limit: int = 5) -> list[dict]:
    """Return top customers by total invoice value."""
    stmt = (
        select(
            Customer.id,
            Customer.name,
            Customer.code,
            func.coalesce(func.sum(Invoice.total), 0).label("total"),
            func.count(Invoice.id).label("invoice_count"),
        )
        .join(Invoice, Invoice.customer_id == Customer.id)
        .where(Customer.tenant_id == tenant_id)
        .group_by(Customer.id, Customer.name, Customer.code)
        .order_by(func.sum(Invoice.total).desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id": str(row[0]),
            "name": row[1],
            "code": row[2],
            "total": str(row[3]),
            "invoice_count": row[4],
        }
        for row in rows
    ]

