"""add approved invoice status to existing tenants

Revision ID: 8d6b3d2a4f10
Revises: add_extended_business_fields
Create Date: 2026-10-17

"""
from typing import Sequence, Union

from alembic import op


revision: str = "8d6b3d2a4f10"
down_revision: Union[str, None] = "add_extended_business_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
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
            SELECT 1
            FROM statuses s
            WHERE s.tenant_id = t.id
              AND s.entity_type = 'invoice'
              AND s.code = 'approved'
        )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM statuses
        WHERE entity_type = 'invoice'
          AND code = 'approved'
          AND NOT EXISTS (
              SELECT 1
              FROM invoices i
              WHERE i.status_id = statuses.id
          )
        """
    )
