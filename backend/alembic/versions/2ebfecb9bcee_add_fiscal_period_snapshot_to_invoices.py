"""add fiscal period snapshot to invoices

Revision ID: 2ebfecb9bcee
Revises: 0efbfabf97cc
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ebfecb9bcee'
down_revision: Union[str, None] = '0efbfabf97cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('invoices', sa.Column('fiscal_period_id', sa.UUID(), nullable=True))
    op.add_column('invoices', sa.Column('fiscal_period_name_snapshot', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_invoices_fiscal_period_id'), 'invoices', ['fiscal_period_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_invoices_fiscal_period_id_fiscal_periods'),
        'invoices',
        'fiscal_periods',
        ['fiscal_period_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(op.f('fk_invoices_fiscal_period_id_fiscal_periods'), 'invoices', type_='foreignkey')
    op.drop_index(op.f('ix_invoices_fiscal_period_id'), table_name='invoices')
    op.drop_column('invoices', 'fiscal_period_name_snapshot')
    op.drop_column('invoices', 'fiscal_period_id')