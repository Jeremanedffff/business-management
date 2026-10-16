"""Payment service - record and list payments."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.payment_methods import PaymentMethod, is_mobile_money
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.status import Status
from app.schemas.payment import PaymentCreate
from app.services import audit_service
from app.services.invoice_service import _assert_period_open

PAYMENT_AUDIT_FIELDS = [
    "amount", "payment_date", "payment_method",
    "reference", "payer_phone", "notes",
]


def list_payments_for_invoice(db: Session, tenant_id: UUID, invoice_id: UUID) -> list[Payment]:
    stmt = (
        select(Payment)
        .where(
            Payment.tenant_id == tenant_id,
            Payment.invoice_id == invoice_id,
        )
        .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def _get_paid_status(db: Session, tenant_id: UUID) -> Status | None:
    stmt = select(Status).where(
        Status.tenant_id == tenant_id,
        Status.entity_type == "invoice",
        Status.code == "paid",
    )
    return db.execute(stmt).scalar_one_or_none()


def _validate_payment_method(method: str) -> str:
    """Ensure the method is one of the allowed enum values."""
    try:
        return PaymentMethod(method).value
    except ValueError as exc:
        allowed = [m.value for m in PaymentMethod]
        raise ValueError(f"Invalid payment method: {method}. Allowed: {allowed}") from exc


def record_payment(
    db: Session, tenant_id: UUID, user_id: UUID, invoice_id: UUID, payload: PaymentCreate
) -> Payment:
    # 1. Validate payment method
    method = _validate_payment_method(payload.payment_method)

    # 2. Find invoice
    invoice = db.execute(
        select(Invoice).where(
            Invoice.tenant_id == tenant_id,
            Invoice.id == invoice_id,
        )
    ).scalar_one_or_none()
    if invoice is None:
        raise ValueError("Invoice not found")

    _assert_period_open(db, invoice)

    # 3. Invoice status must permit payments
    if invoice.status_id:
        current = db.execute(select(Status).where(Status.id == invoice.status_id)).scalar_one_or_none()
        if current and current.code == "cancelled":
            raise ValueError("Cannot record payments against a cancelled invoice")
        if current and current.code == "draft":
            raise ValueError("Invoice must be approved before recording payments")

    # 4. Reject non-positive amounts
    if payload.amount <= 0:
        raise ValueError("Payment amount must be positive")

    # 5. Reject overpayment
    new_total_paid = invoice.amount_paid + payload.amount
    if new_total_paid > invoice.total:
        outstanding = invoice.total - invoice.amount_paid
        raise ValueError(f"Payment exceeds invoice balance. Outstanding: {outstanding}")

    # 6. If method requires a phone, require payer_phone
    if is_mobile_money(method) and not payload.payer_phone:
        raise ValueError(f"A phone number is required for {method}")

    # 7. Create payment
    payment = Payment(
        tenant_id=tenant_id,
        invoice_id=invoice_id,
        amount=payload.amount,
        payment_date=payload.payment_date or date.today(),
        payment_method=method,
        payer_phone=payload.payer_phone,
        reference=payload.reference,
        notes=payload.notes,
    )
    db.add(payment)

    # 8. Update invoice
    invoice.amount_paid = new_total_paid

    # 9. Auto-mark as paid if fully paid
    if new_total_paid >= invoice.total:
        paid_status = _get_paid_status(db, tenant_id)
        if paid_status:
            invoice.status_id = paid_status.id

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="invoice.payment_recorded",
        entity_type="invoice",
        entity_id=invoice.id,
        new_values=audit_service.snapshot(payment, PAYMENT_AUDIT_FIELDS),
    )

    db.commit()
    db.refresh(payment)
    return payment


def delete_payment(db: Session, tenant_id: UUID, user_id: UUID, payment_id: UUID) -> bool:
    payment = db.execute(
        select(Payment).where(
            Payment.tenant_id == tenant_id,
            Payment.id == payment_id,
        )
    ).scalar_one_or_none()
    if payment is None:
        return False

    invoice = db.execute(
        select(Invoice).where(Invoice.id == payment.invoice_id)
    ).scalar_one_or_none()
    if invoice:
        _assert_period_open(db, invoice)
        invoice.amount_paid = invoice.amount_paid - payment.amount

    old_snap = audit_service.snapshot(payment, PAYMENT_AUDIT_FIELDS)
    invoice_id_for_audit = payment.invoice_id
    payment_id_for_audit = payment.id

    db.delete(payment)

    audit_service.log_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="invoice.payment_deleted",
        entity_type="invoice",
        entity_id=invoice_id_for_audit,
        old_values=old_snap,
        notes="Deleted payment " + str(payment_id_for_audit),
    )

    db.commit()
    return True

