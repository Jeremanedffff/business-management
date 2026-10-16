"""Main v1 API router - aggregates all module routers."""

from fastapi import APIRouter

from app.api.v1.routes import (
    adjustment_notes,
    audit_logs,
    auth,
    currencies,
    customers,
    dashboard,
    fiscal_periods,
    invoices,
    invitations,
    payments,
    payment_methods,
    permissions,
    product_categories,
    products,
    public,
    roles,
    settings,
    statuses,
    tax_categories,
    tax_rates,
    tenants,
    users,
)


api_router = APIRouter()


api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(fiscal_periods.router)
api_router.include_router(customers.router)
api_router.include_router(products.router)
api_router.include_router(public.router)
api_router.include_router(product_categories.router)
api_router.include_router(invoices.router)
api_router.include_router(invitations.router)
api_router.include_router(payments.router)
api_router.include_router(payment_methods.router)
api_router.include_router(adjustment_notes.router)
api_router.include_router(audit_logs.router)
api_router.include_router(currencies.router)
api_router.include_router(tax_categories.router)
api_router.include_router(tax_rates.router)
api_router.include_router(statuses.router)
api_router.include_router(settings.router)
api_router.include_router(users.router)
api_router.include_router(roles.router)
api_router.include_router(tenants.router)
api_router.include_router(permissions.router)

