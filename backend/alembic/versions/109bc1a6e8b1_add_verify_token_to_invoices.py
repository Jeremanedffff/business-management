"""add verify_token to invoices

Revision ID: 109bc1a6e8b1
Revises: bcbac190b920
Create Date: 2026-10-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '109bc1a6e8b1'
down_revision: Union[str, None] = 'bcbac190b920'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the column
    op.add_column(
        'invoices',
        sa.Column('verify_token', UUID(as_uuid=True), nullable=True),
    )

    # 2. Backfill: every existing invoice gets a fresh token
    op.execute("UPDATE invoices SET verify_token = gen_random_uuid() WHERE verify_token IS NULL")

    # 3. Unique index (partial: only when not null)
    op.create_index(
        'uq_invoices_verify_token',
        'invoices',
        ['verify_token'],
        unique=True,
        postgresql_where=sa.text('verify_token IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('uq_invoices_verify_token', table_name='invoices')
    op.drop_column('invoices', 'verify_token')
