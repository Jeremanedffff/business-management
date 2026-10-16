"""add creator snapshot to invoices

Revision ID: a39ba10f2ab7
Revises: 2ebfecb9bcee
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a39ba10f2ab7'
down_revision: Union[str, None] = '2ebfecb9bcee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('invoices', sa.Column('created_by_user_id', sa.UUID(), nullable=True))
    op.add_column('invoices', sa.Column('created_by_name_snapshot', sa.String(length=200), nullable=True))
    op.create_index(op.f('ix_invoices_created_by_user_id'), 'invoices', ['created_by_user_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_invoices_created_by_user_id_users'),
        'invoices',
        'users',
        ['created_by_user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(op.f('fk_invoices_created_by_user_id_users'), 'invoices', type_='foreignkey')
    op.drop_index(op.f('ix_invoices_created_by_user_id'), table_name='invoices')
    op.drop_column('invoices', 'created_by_name_snapshot')
    op.drop_column('invoices', 'created_by_user_id')