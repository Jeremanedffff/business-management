"""Adjustment note service - credit and debit notes."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.adjustment_note import AdjustmentNote
from app.models.adjustment_note_item import AdjustmentNoteItem
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.status import Status
from app.models.tax_rate import TaxRate
from app.schemas.adjustment_note import AdjustmentNoteCreate


def _next_note_number(db: Session, tenant_id: UUID, note_type: str) -> str:
    prefix = "CN-" if note_type == "credit" else "DN-"
    count = db.execute(
        select(func.count())
        .select_from(AdjustmentNote)
        .where(
            AdjustmentNote.tenant_id == tenant_id,
            AdjustmentNote.note_type == note_type,
        )
    ).scalar() or 0
    return f"{prefix}{count + 1:04d}"


def _issued_status(db: Session, tenant_id: UUID) -> Status | None:
    stmt = select(Status).where(
        Status.tenant_id == tenant_id,
        Status.entity_type == "adjustment_note",
        Status.code == "issued",
    )
    return db.execute(stmt).scalar_one_or_none()


def _cancelled_status_id(db: Session, tenant_id: UUID) -> UUID | None:
    stmt = select(Status.id).where(
        Status.tenant_id == tenant_id,
        Status.entity_type == "adjustment_note",
        Status.code == "cancelled",
    )
    return db.execute(stmt).scalar_one_or_none()


def _attach_status_info(db: Session, notes: list) -> list:
    if not notes:
        return notes
    status_ids = [n.status_id for n in notes if n.status_id]
    if not status_ids:
        return notes
    statuses = db.execute(select(Status).where(Status.id.in_(status_ids))).scalars().all()
    status_map = {s.id: s for s in statuses}
    for n in notes:
        if n.status_id and n.status_id in status_map:
            s = status_map[n.status_id]
            n.status_code = s.code
            n.status_name = s.name
        else:
            n.status_code = None
            n.status_name = None
    return notes


def get_returned_qty_map(db: Session, tenant_id: UUID, invoice_id: UUID) -> dict:
    cancelled_id = _cancelled_status_id(db, tenant_id)
    stmt = (
        select(
            AdjustmentNoteItem.invoice_item_id,
            func.coalesce(func.sum(AdjustmentNoteItem.quantity), 0),
        )
        .join(AdjustmentNote, AdjustmentNote.id == AdjustmentNoteItem.note_id)
        .where(
            AdjustmentNote.tenant_id == tenant_id,
            AdjustmentNote.invoice_id == invoice_id,
            AdjustmentNoteItem.invoice_item_id.isnot(None),
        )
        .group_by(AdjustmentNoteItem.invoice_item_id)
    )
    if cancelled_id:
        stmt = stmt.where(AdjustmentNote.status_id != cancelled_id)
    rows = db.execute(stmt).all()
    return {row[0]: Decimal(row[1]) for row in rows if row[0]}


def create_note(db: Session, tenant_id: UUID, payload: AdjustmentNoteCreate) -> AdjustmentNote:
    invoice = db.execute(
        select(Invoice).where(
            Invoice.tenant_id == tenant_id,
            Invoice.id == payload.invoice_id,
        )
    ).scalar_one_or_none()
    if invoice is None:
        raise ValueError("Invoice not found")
    if invoice.status_id:
        current = db.execute(select(Status).where(Status.id == invoice.status_id)).scalar_one_or_none()
        if current and current.code == "cancelled":
            raise ValueError("Cannot adjust a cancelled invoice")
    customer = db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.id == invoice.customer_id,
        )
    ).scalar_one_or_none()
    if customer is None:
        raise ValueError("Customer not found")

    returned_map = get_returned_qty_map(db, tenant_id, payload.invoice_id)
    requested = {}
    for it in payload.items:
        if it.invoice_item_id:
            requested[it.invoice_item_id] = requested.get(it.invoice_item_id, Decimal("0")) + it.quantity
    for item_id, req_qty in requested.items():
        line = db.execute(
            select(InvoiceItem).where(
                InvoiceItem.invoice_id == payload.invoice_id,
                InvoiceItem.id == item_id,
            )
        ).scalar_one_or_none()
        if line is None:
            raise ValueError("Invoice line not found on original invoice")
        already = returned_map.get(item_id, Decimal("0"))
        available = line.quantity - already
        if req_qty > available:
            desc = (line.description or "")[:40]
            parts = [
                "Line",
                repr(desc),
                "exceeds available quantity.",
                "Ordered:",
                str(line.quantity) + ",",
                "already adjusted:",
                str(already) + ",",
                "available:",
                str(available) + ",",
                "requested:",
                str(req_qty) + ".",
            ]
            raise ValueError(" ".join(parts))

    note_number = _next_note_number(db, tenant_id, payload.note_type)
    status_obj = _issued_status(db, tenant_id)
    note = AdjustmentNote(
        tenant_id=tenant_id,
        note_type=payload.note_type,
        note_number=note_number,
        invoice_id=payload.invoice_id,
        customer_id=invoice.customer_id,
        status_id=status_obj.id if status_obj else None,
        issue_date=payload.issue_date or date.today(),
        original_invoice_number_snapshot=invoice.invoice_number,
        original_invoice_date_snapshot=invoice.issue_date,
        customer_reference_snapshot=invoice.reference,
        reason=payload.reason,
        notes=payload.notes,
    )
    db.add(note)
    db.flush()

    subtotal = Decimal("0")
    tax_total = Decimal("0")
    total = Decimal("0")
    for idx, item_in in enumerate(payload.items, start=1):
        tax_rate_value = Decimal("0")
        tax_code = None
        if item_in.tax_rate_id:
            tr = db.execute(
                select(TaxRate).where(
                    TaxRate.tenant_id == tenant_id,
                    TaxRate.id == item_in.tax_rate_id,
                )
            ).scalar_one_or_none()
            if tr is None:
                raise ValueError("Tax rate not found")
            tax_rate_value = tr.rate
            tax_code = tr.code
        line_subtotal = item_in.quantity * item_in.unit_price
        line_tax = (line_subtotal * tax_rate_value).quantize(Decimal("0.0001"))
        line_total = line_subtotal + line_tax
        line = AdjustmentNoteItem(
            note_id=note.id,
            tenant_id=tenant_id,
            line_number=idx,
            invoice_item_id=item_in.invoice_item_id,
            description=item_in.description,
            quantity=item_in.quantity,
            unit_price=item_in.unit_price,
            line_subtotal=line_subtotal,
            line_tax=line_tax,
            line_total=line_total,
            tax_rate_snapshot=tax_rate_value,
            tax_code_snapshot=tax_code,
        )
        db.add(line)
        subtotal += line_subtotal
        tax_total += line_tax
        total += line_total

    note.subtotal = subtotal
    note.tax_total = tax_total
    note.total = total
    db.commit()
    db.refresh(note)
    _attach_status_info(db, [note])
    return note


def list_notes(db: Session, tenant_id: UUID, note_type=None):
    stmt = select(AdjustmentNote).where(AdjustmentNote.tenant_id == tenant_id)
    if note_type:
        stmt = stmt.where(AdjustmentNote.note_type == note_type)
    stmt = stmt.order_by(AdjustmentNote.created_at.desc())
    notes = list(db.execute(stmt).scalars().all())
    return _attach_status_info(db, notes)


def list_notes_for_invoice(db: Session, tenant_id: UUID, invoice_id: UUID):
    stmt = (
        select(AdjustmentNote)
        .where(
            AdjustmentNote.tenant_id == tenant_id,
            AdjustmentNote.invoice_id == invoice_id,
        )
        .order_by(AdjustmentNote.created_at.desc())
    )
    notes = list(db.execute(stmt).scalars().all())
    return _attach_status_info(db, notes)


def get_note(db: Session, tenant_id: UUID, note_id: UUID):
    stmt = select(AdjustmentNote).where(
        AdjustmentNote.tenant_id == tenant_id,
        AdjustmentNote.id == note_id,
    )
    note = db.execute(stmt).scalar_one_or_none()
    if note is not None:
        _attach_status_info(db, [note])
    return note


def cancel_note(db: Session, tenant_id: UUID, note_id: UUID):
    note = get_note(db, tenant_id, note_id)
    if note is None:
        raise ValueError("Adjustment note not found")
    if note.status_code == "cancelled":
        raise ValueError("Note is already cancelled")
    cancelled = db.execute(
        select(Status).where(
            Status.tenant_id == tenant_id,
            Status.entity_type == "adjustment_note",
            Status.code == "cancelled",
        )
    ).scalar_one_or_none()
    if cancelled is None:
        raise ValueError("Cancelled status not configured")
    note.status_id = cancelled.id
    db.commit()
    db.refresh(note)
    _attach_status_info(db, [note])
    return note


def get_adjustment_totals(db: Session, tenant_id: UUID, invoice_id: UUID) -> dict:
    stmt = select(AdjustmentNote).where(
        AdjustmentNote.tenant_id == tenant_id,
        AdjustmentNote.invoice_id == invoice_id,
    )
    notes = db.execute(stmt).scalars().all()
    active = []
    for n in notes:
        if n.status_id:
            st = db.execute(select(Status).where(Status.id == n.status_id)).scalar_one_or_none()
            if st and st.code == "cancelled":
                continue
        active.append(n)
    credits = sum((n.total for n in active if n.note_type == "credit"), Decimal("0"))
    debits = sum((n.total for n in active if n.note_type == "debit"), Decimal("0"))
    return {"credits": credits, "debits": debits}

