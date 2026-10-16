"""fix draft invoices with payments

Revision ID: bcbac190b920
Revises: da636321dc77
Create Date: 2026-10-02

When the "no payments on draft" rule is enforced, any existing draft
invoices that already have payments would become inconsistent. Move
them to 'approved' so the new rule can be enforced cleanly.

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'bcbac190b920'
down_revision: Union[str, None] = 'da636321dc77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Any invoice currently in 'draft' that has at least one payment
    # is moved to 'approved'. Business reality: a payment was accepted,
    # so the invoice was effectively finalized.
    op.execute("""
        UPDATE invoices
        SET status_id = (
            SELECT s.id
            FROM statuses s
            WHERE s.tenant_id = invoices.tenant_id
              AND s.entity_type = 'invoice'
              AND s.code = 'approved'
        )
        WHERE invoices.status_id IN (
            SELECT s.id
            FROM statuses s
            WHERE s.entity_type = 'invoice'
              AND s.code = 'draft'
        )
          AND invoices.id IN (
              SELECT DISTINCT invoice_id FROM payments
          )
    """)


def downgrade() -> None:
    # Reverse: send approved invoices with payments back to draft.
    # This is a simplification; in practice, if you roll back, you
    # will need to review which invoices to send back manually.
    op.execute("""
        UPDATE invoices
        SET status_id = (
            SELECT s.id
            FROM statuses s
            WHERE s.tenant_id = invoices.tenant_id
              AND s.entity_type = 'invoice'
              AND s.code = 'draft'
        )
        WHERE invoices.status_id IN (
            SELECT s.id
            FROM statuses s
            WHERE s.entity_type = 'invoice'
              AND s.code = 'approved'
        )
          AND invoices.id IN (
              SELECT DISTINCT invoice_id FROM payments
          )
    """)
