"""add is_default to tax_rates

Revision ID: 83a3f49a8eb3
Revises: 35ccaf06953c
Create Date: 2026-09-28 16:02:14.072711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83a3f49a8eb3'
down_revision: Union[str, None] = '35ccaf06953c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the new column with a server-side default so existing rows get false.
    op.add_column(
        'tax_rates',
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # 2. Backfill: for each tenant, mark the rate referenced by their
    #    'default_tax_rate_code' setting as the default.
    op.execute("""
        UPDATE tax_rates tr
        SET is_default = true
        FROM tenant_settings ts
        WHERE ts.tenant_id = tr.tenant_id
          AND ts.key = 'default_tax_rate_code'
          AND ts.value = tr.code
    """)

    # 3. Clean up the orphaned setting (nothing in the codebase reads it).
    op.execute("DELETE FROM tenant_settings WHERE key = 'default_tax_rate_code'")


def downgrade() -> None:
    # 1. Restore the setting from whichever rate is marked as default.
    op.execute("""
        INSERT INTO tenant_settings (id, tenant_id, key, value, created_at, updated_at)
        SELECT gen_random_uuid(), tenant_id, 'default_tax_rate_code', code, now(), now()
        FROM tax_rates
        WHERE is_default = true
    """)

    # 2. Drop the column.
    op.drop_column('tax_rates', 'is_default')
