"""Dashboard schemas."""

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_invoices: int
    total_revenue: str
    total_paid: str
    outstanding: str
    paid_count: int
    unpaid_count: int
    total_customers: int
    total_products: int


class RecentInvoice(BaseModel):
    id: str
    invoice_number: str
    reference: str | None
    issue_date: str
    total: str
    amount_paid: str


class RevenueByMonth(BaseModel):
    month: str
    total: str


class TopCustomer(BaseModel):
    id: str
    name: str
    code: str
    total: str
    invoice_count: int

