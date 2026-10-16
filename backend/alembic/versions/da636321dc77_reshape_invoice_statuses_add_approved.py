"""reshape invoice statuses add approved

Revision ID: da636321dc77
Revises: 033600994902
Create Date: 2026-10-02

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'da636321dc77'
down_revision: Union[str, None] = '033600994902'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Remove unused invoice statuses (0 invoices reference them).
    op.execute("""
        DELETE FROM statuses
        WHERE entity_type = 'invoice'
          AND code IN ('sent', 'overdue')
    """)

    # 2. Add 'approved' status for invoices, one per tenant.
    op.execute("""
        INSERT INTO statuses
            (id, tenant_id, entity_type, code, name, color, sort_order, is_active, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            t.id,
            'invoice',
            'approved',
            'Approved',
            'blue',
            15,
            true,
            now(),
            now()
        FROM tenants t
        WHERE NOT EXISTS (
            SELECT 1 FROM statuses s
            WHERE s.tenant_id = t.id
              AND s.entity_type = 'invoice'
              AND s.code = 'approved'
        )
    """)


def downgrade() -> None:
    # 1. Remove 'approved' status.
    op.execute("""
        DELETE FROM statuses
        WHERE entity_type = 'invoice'
          AND code = 'approved'
    """)

    # 2. Restore 'sent' and 'overdue' statuses, one per tenant.
    op.execute("""
        INSERT INTO statuses
            (id, tenant_id, entity_type, code, name, color, sort_order, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), t.id, 'invoice', 'sent', 'Sent', 'amber', 10, true, now(), now()
        FROM tenants t
        WHERE NOT EXISTS (
            SELECT 1 FROM statuses s
            WHERE s.tenant_id = t.id AND s.entity_type = 'invoice' AND s.code = 'sent'
        )
    """)
    op.execute("""
        INSERT INTO statuses
            (id, tenant_id, entity_type, code, name, color, sort_order, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), t.id, 'invoice', 'overdue', 'Overdue', 'red', 20, true, now(), now()
        FROM tenants t
        WHERE NOT EXISTS (
            SELECT 1 FROM statuses s
            WHERE s.tenant_id = t.id AND s.entity_type = 'invoice' AND s.code = 'overdue'
        )
    """)
