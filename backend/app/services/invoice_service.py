"""Invoice service - core invoicing business logic."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.currency import Currency
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.fiscal_period import FiscalPeriod
from app.models.invoice_item import InvoiceItem
from app.models.payment import Payment
from app.models.product import Product
from app.models.status import Status
from app.models.tenant import Tenant
from app.models.tenant_setting import TenantSetting
from app.models.user import User
from app.models.tax_rate import TaxRate
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from app.services.setting_service import get_tenant_setting
from app.services import audit_service

INVOICE_AUDIT_FIELDS = [
    "invoice_number", "reference", "customer_id", "status_id",
    "subtotal", "discount_total", "tax_total", "total", "amount_paid",
    "issue_date", "due_date", "notes", "terms",
]


def _get_setting_value(db: Session, tenant_id: UUID, key: str, default: str = "") -> str:
    setting = get_tenant_setting(db, tenant_id, key)
    return setting.value if setting and setting.value is not None else default


def _next_invoice_number(db: Session, tenant_id: UUID) -> str:
    db.execute(select(Tenant.id).where(Tenant.id == tenant_id).with_for_update())
    prefix = _get_setting_value(db, tenant_id, "invoice_prefix", "INV-")
    next_str = _get_setting_value(db, tenant_id, "invoice_next_number", "1")
    try:
        next_num = int(next_str)
    except ValueError:
        next_num = 1
    return f"{prefix}{next_num:04d}"


def _increment_invoice_counter(db: Session, tenant_id: UUID) -> None:
    setting = get_tenant_setting(db, tenant_id, "invoice_next_number")
    current = setting.value if setting and setting.value is not None else "1"
    try:
        next_num = int(current) + 1
    except ValueError:
        next_num = 2
    if setting is None:
        db.add(
            TenantSetting(
                tenant_id=tenant_id,
                key="invoice_next_number",
                value=str(next_num),
                description="Next invoice number for this business",
            )
        )
    else:
        setting.value = str(next_num)


def _default_currency(db: Session) -> Currency:
    stmt = select(Currency).where(Currency.code == "LSL")
    currency = db.execute(stmt).scalar_one_or_none()
    if currency is None:
        stmt = select(Currency).where(Currency.is_active.is_(True))
        currency = db.execute(stmt).scalars().first()
    if currency is None:
        raise ValueError("No currency available")
    return currency


def _default_invoice_status(db: Session, tenant_id: UUID) -> Status | None:
    stmt = select(Status).where(
        Status.tenant_id == tenant_id,
        Status.entity_type == "invoice",
        Status.code == "draft",
    )
    return db.execute(stmt).scalar_one_or_none()


def _build_line_items_and_totals(db: Session, tenant_id: UUID, invoice: Invoice, items_in) -> None:
    subtotal = Decimal("0")
    discount_total = Decimal("0")
    tax_total = Decimal("0")
    grand_total = Decimal("0")

    for idx, item_in in enumerate(items_in, start=1):
        tax_rate_value = Decimal("0")
        tax_name = None
        tax_code = None
        tax_rate_id = item_in.tax_rate_id

        if tax_rate_id:
            tr = db.execute(
                select(TaxRate).where(
                    TaxRate.tenant_id == tenant_id,
                    TaxRate.id == tax_rate_id,
                )
            ).scalar_one_or_none()
            if tr is None:
                raise ValueError(f"Tax rate not found for item {idx}")
            tax_rate_value = tr.rate
            tax_name = tr.name
            tax_code = tr.code

        item_number = None
        is_service = False
        category_id = None
        if item_in.product_id:
            prod = db.execute(
                select(Product).where(
                    Product.tenant_id == tenant_id,
                    Product.id == item_in.product_id,
                )
            ).scalar_one_or_none()
            if prod:
                item_number = prod.code
                is_service = prod.item_type == "service"
                category_id = prod.category_id

        line_subtotal = (item_in.quantity * item_in.unit_price) - item_in.discount_amount
        line_tax = (line_subtotal * tax_rate_value).quantize(Decimal("0.0001"))
        line_total = line_subtotal + line_tax

        line_item = InvoiceItem(
            invoice_id=invoice.id,
            tenant_id=tenant_id,
            line_number=idx,
            product_id=item_in.product_id,
            tax_rate_id=tax_rate_id,
            category_id=category_id,
            item_number=item_number,
            description=item_in.description,
            unit=item_in.unit,
            quantity=item_in.quantity,
            unit_price=item_in.unit_price,
            discount_amount=item_in.discount_amount,
            line_subtotal=line_subtotal,
            line_tax=line_tax,
            line_total=line_total,
            tax_rate_snapshot=tax_rate_value,
            tax_name_snapshot=tax_name,
            tax_code_snapshot=tax_code,
            is_service=is_service,
        )
        db.add(line_item)

        subtotal += line_subtotal
        discount_total += item_in.discount_amount
        tax_total += line_tax
        grand_total += line_total

    invoice.subtotal = subtotal
    invoice.discount_total = discount_total
    invoice.tax_total = tax_total
    invoice.total = grand_total


def create_invoice(db: Session, tenant_id: UUID, user_id: UUID, payload: InvoiceCreate) -> Invoice:
    customer = db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.id == payload.customer_id,
        )
    ).scalar_one_or_none()
    if customer is None:
        raise ValueError("Customer not found")

    tenant = db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    ).scalar_one_or_none()
    if tenant is None:
        raise ValueError("Tenant not found")

    actor = db.get(User, user_id)
    if actor is not None:
        actor_full_name = " ".join(
            p for p in [actor.first_name, actor.last_name] if p
        ).strip()
        actor_display_name = actor_full_name or actor.email
    else:
        actor_display_name = None

    if payload.currency_id:
        currency = db.execute(select(Currency).where(Currency.id == payload.currency_id)).scalar_one_or_none()
        if currency is None:
            raise ValueError("Currency not found")
    else:
        currency = _default_currency(db)

    status_obj = _default_invoice_status(db, tenant_id)
    invoice_number = _next_invoice_number(db, tenant_id)

    current_period = db.execute(
        select(FiscalPeriod).where(
            FiscalPeriod.tenant_id == tenant_id,
            FiscalPeriod.status == "open",
        )
    ).scalar_one_or_none()

    if current_period is None:
        raise ValueError("No fiscal period is open. Open a fiscal period before creating invoices.")

    invoice = Invoice(
        tenant_id=tenant_id,
        invoice_number=invoice_number,
        document_type="FiscalInvoice",
        verify_token=uuid.uuid4(),
        reference=payload.reference,
        customer_id=payload.customer_id,
        status_id=status_obj.id if status_obj else None,
        currency_id=currency.id,
        issue_date=payload.issue_date or date.today(),
        issued_at=datetime.now(timezone.utc),
        due_date=payload.due_date,
        notes=payload.notes,
        terms=payload.terms,
        customer_name_snapshot=customer.name,
        customer_vat_number_snapshot=customer.vat_number,
        customer_address_snapshot=customer.address,
        customer_tin_snapshot=customer.tin,
        customer_trading_name_snapshot=customer.trading_name,
        seller_tin_snapshot=tenant.tin,
        seller_vat_number_snapshot=tenant.vat_number,
        seller_name_snapshot=tenant.legal_name or tenant.name,
        seller_trading_name_snapshot=tenant.trading_name,
        seller_address_snapshot=tenant.address,
        fiscal_period_id=current_period.id if current_period else None,
        fiscal_period_name_snapshot=current_period.name if current_period else None,
        created_by_user_id=user_id,
        created_by_name_snapshot=actor_display_name,
    )
    db.add(invoice)
    db.flush()

    _build_line_items_and_totals(db, tenant_id, invoice, payload.items)
    _increment_invoice_counter(db, tenant_id)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="invoice.created",
        entity_type="invoice",
        entity_id=invoice.id,
        new_values=audit_service.snapshot(invoice, INVOICE_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(invoice)
    return invoice


def _attach_status_info(db: Session, invoices: list[Invoice]) -> list[Invoice]:
    """Attach status_code and status_name dynamically (not persisted)."""
    if not invoices:
        return invoices
    status_ids = [inv.status_id for inv in invoices if inv.status_id]
    if not status_ids:
        return invoices
    statuses = db.execute(select(Status).where(Status.id.in_(status_ids))).scalars().all()
    status_map = {s.id: s for s in statuses}
    for inv in invoices:
        if inv.status_id and inv.status_id in status_map:
            s = status_map[inv.status_id]
            # Attach as dynamic attributes (Pydantic from_attributes reads these)
            inv.status_code = s.code
            inv.status_name = s.name
        else:
            inv.status_code = None
            inv.status_name = None
    return invoices




def search_invoices(
    db: Session,
    tenant_id: UUID,
    query: str,
    limit: int = 20,
    offset: int = 0,
) -> list[Invoice]:
    """Search invoices by number, customer name, or reference."""
    normalized_query = query.strip()
    if not normalized_query:
        return []
    term = f"%{normalized_query}%"
    stmt = (
        select(Invoice)
        .where(Invoice.tenant_id == tenant_id)
        .where(
            (Invoice.invoice_number.ilike(term))
            | (Invoice.customer_name_snapshot.ilike(term))
            | (Invoice.reference.ilike(term))
        )
        .options(selectinload(Invoice.items))
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        .limit(limit)
        .offset(offset)
    )
    invoices = list(db.execute(stmt).scalars().all())
    return _attach_status_info(db, invoices)

def list_invoices(
    db: Session,
    tenant_id: UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Invoice]:
    stmt = (
        select(Invoice)
        .where(Invoice.tenant_id == tenant_id)
        .options(selectinload(Invoice.items))
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        .limit(limit)
        .offset(offset)
    )
    invoices = list(db.execute(stmt).scalars().all())
    return _attach_status_info(db, invoices)


def get_invoice(db: Session, tenant_id: UUID, invoice_id: UUID) -> Invoice | None:
    stmt = select(Invoice).where(
        Invoice.tenant_id == tenant_id,
        Invoice.id == invoice_id,
    )
    invoice = db.execute(stmt).scalar_one_or_none()
    if invoice is not None:
        _attach_status_info(db, [invoice])
    return invoice


def get_payments_for_invoice(db: Session, tenant_id: UUID, invoice_id: UUID) -> list[Payment]:
    stmt = (
        select(Payment)
        .where(
            Payment.tenant_id == tenant_id,
            Payment.invoice_id == invoice_id,
        )
        .order_by(Payment.payment_date.desc())
    )
    return list(db.execute(stmt).scalars().all())


def _is_within_edit_window(invoice: Invoice) -> bool:
    """Approved invoices can be edited for 6 months from issue_date."""
    if invoice.issue_date is None:
        return True
    from datetime import date as _date
    from dateutil.relativedelta import relativedelta
    today = _date.today()
    six_months_later = invoice.issue_date + relativedelta(months=6)
    return today <= six_months_later


def _assert_period_open(db: Session, invoice: Invoice) -> None:
    """Block writes to an invoice whose fiscal period is no longer open.

    Legacy invoices with no period (or a deleted period) are allowed.
    """
    if invoice.fiscal_period_id is None:
        return
    period = db.get(FiscalPeriod, invoice.fiscal_period_id)
    if period is None:
        return
    if period.status != "open":
        raise ValueError(
            f"This invoice belongs to fiscal period '{period.name}' "
            f"which is {period.status}. To correct it, issue a credit or debit note."
        )


def update_invoice(db: Session, tenant_id: UUID, user_id: UUID, invoice_id: UUID, payload: InvoiceUpdate) -> Invoice:
    invoice = get_invoice(db, tenant_id, invoice_id)
    if invoice is None:
        raise ValueError("Invoice not found")

    _assert_period_open(db, invoice)

    if invoice.status_code == "cancelled":
        raise ValueError("Cannot edit a cancelled invoice")
    if invoice.status_code == "paid":
        raise ValueError("Cannot edit a paid invoice")
    if invoice.status_code == "approved" and not _is_within_edit_window(invoice):
        raise ValueError("This invoice is past its 6-month edit window and can no longer be changed. Issue a credit or debit note instead.")

    old_snap = audit_service.snapshot(invoice, INVOICE_AUDIT_FIELDS)

    update_data = payload.model_dump(exclude_unset=True)
    items_in = update_data.pop("items", None)

    for field, value in update_data.items():
        setattr(invoice, field, value)

    if items_in is not None:
        for existing in list(invoice.items):
            db.delete(existing)
        db.flush()

        invoice.subtotal = Decimal("0")
        invoice.discount_total = Decimal("0")
        invoice.tax_total = Decimal("0")
        invoice.total = Decimal("0")

        from app.schemas.invoice import InvoiceItemCreate
        parsed_items = [InvoiceItemCreate(**it) for it in items_in]
        _build_line_items_and_totals(db, tenant_id, invoice, parsed_items)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="invoice.updated",
        entity_type="invoice",
        entity_id=invoice.id,
        old_values=old_snap,
        new_values=audit_service.snapshot(invoice, INVOICE_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(invoice)
    _attach_status_info(db, [invoice])
    return invoice


def change_status(db: Session, tenant_id: UUID, user_id: UUID, invoice_id: UUID, status_code: str) -> Invoice:
    invoice = get_invoice(db, tenant_id, invoice_id)
    if invoice is None:
        raise ValueError("Invoice not found")

    _assert_period_open(db, invoice)

    new_status = db.execute(
        select(Status).where(
            Status.tenant_id == tenant_id,
            Status.entity_type == "invoice",
            Status.code == status_code,
        )
    ).scalar_one_or_none()
    if new_status is None:
        raise ValueError(f"Unknown status: {status_code}")

    current = invoice.status_code

    if current == "cancelled":
        raise ValueError("Cancelled invoices cannot change status")
    if current == "paid":
        raise ValueError("Paid invoices cannot change status")

    if status_code == "paid":
        raise ValueError("Paid status is set automatically when an invoice is fully paid")

    if current == "draft" and status_code not in ("approved", "cancelled"):
        raise ValueError(f"Draft invoices can only be approved or cancelled (attempted: {status_code})")

    if current == "approved" and status_code not in ("draft", "cancelled"):
        raise ValueError(f"Approved invoices can only be reverted to draft or cancelled (attempted: {status_code})")

    if current == "approved" and status_code == "draft" and not _is_within_edit_window(invoice):
        raise ValueError("This invoice is past its 6-month edit window and can no longer be reverted")

    if current == "approved" and status_code in ("draft", "cancelled") and invoice.amount_paid > 0:
        raise ValueError("Cannot revert or cancel an invoice with recorded payments. Refund or credit note required.")

    if status_code == "approved":
        action = "invoice.approved"
    elif status_code == "draft" and current == "approved":
        action = "invoice.reverted_to_draft"
    elif status_code == "cancelled":
        action = "invoice.cancelled"
    else:
        action = "invoice.status_changed"

    old_snap = {"status_code": current}
    new_snap = {"status_code": status_code}

    invoice.status_id = new_status.id

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity_type="invoice",
        entity_id=invoice.id,
        old_values=old_snap,
        new_values=new_snap,
    )

    db.commit()
    db.refresh(invoice)
    _attach_status_info(db, [invoice])
    return invoice


def cancel_invoice(db: Session, tenant_id: UUID, user_id: UUID, invoice_id: UUID) -> Invoice:
    invoice = get_invoice(db, tenant_id, invoice_id)
    if invoice is None:
        raise ValueError("Invoice not found")

    _assert_period_open(db, invoice)

    if invoice.amount_paid > 0:
        raise ValueError("Cannot cancel an invoice with payments. Refund or credit note required.")

    cancelled = db.execute(
        select(Status).where(
            Status.tenant_id == tenant_id,
            Status.entity_type == "invoice",
            Status.code == "cancelled",
        )
    ).scalar_one_or_none()
    if cancelled is None:
        raise ValueError("Cancelled status not configured for this tenant")

    prior_status = invoice.status_code
    invoice.status_id = cancelled.id

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="invoice.cancelled",
        entity_type="invoice",
        entity_id=invoice.id,
        old_values={"status_code": prior_status},
        new_values={"status_code": "cancelled"},
    )

    db.commit()
    db.refresh(invoice)
    _attach_status_info(db, [invoice])
    return invoice

def approve_invoice(db: Session, tenant_id: UUID, user_id: UUID, invoice_id: UUID) -> Invoice:
    """Move a draft invoice to approved. Only drafts can be approved."""
    invoice = get_invoice(db, tenant_id, invoice_id)
    if invoice is None:
        raise ValueError("Invoice not found")

    _assert_period_open(db, invoice)

    _attach_status_info(db, [invoice])

    if invoice.status_code == "cancelled":
        raise ValueError("Cannot approve a cancelled invoice")
    if invoice.status_code == "paid":
        raise ValueError("Invoice is already paid")
    if invoice.status_code == "approved":
        raise ValueError("Invoice is already approved")
    if invoice.status_code != "draft":
        raise ValueError(f"Only draft invoices can be approved (current: {invoice.status_code})")

    if not invoice.items:
        raise ValueError("Cannot approve an invoice with no line items")

    approved_status = db.execute(
        select(Status).where(
            Status.tenant_id == tenant_id,
            Status.entity_type == "invoice",
            Status.code == "approved",
        )
    ).scalar_one_or_none()
    if approved_status is None:
        raise ValueError("Approved status is not configured for this tenant")

    invoice.status_id = approved_status.id

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="invoice.approved",
        entity_type="invoice",
        entity_id=invoice.id,
        old_values={"status_code": "draft"},
        new_values={"status_code": "approved"},
    )

    db.commit()
    db.refresh(invoice)
    _attach_status_info(db, [invoice])
    return invoice

def verify_invoice_by_token(db: Session, token: uuid.UUID) -> Invoice | None:
    """Public verification lookup. Returns None if not found or not verifiable."""
    stmt = select(Invoice).where(Invoice.verify_token == token)
    invoice = db.execute(stmt).scalar_one_or_none()
    if invoice is None:
        return None

    _attach_status_info(db, [invoice])

    if invoice.status_code not in ("approved", "paid", "cancelled"):
        return None

    return invoice
