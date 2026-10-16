"""add fiscal periods table

Revision ID: 0efbfabf97cc
Revises: 094ce9dd9b9c
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0efbfabf97cc'
down_revision: Union[str, None] = '094ce9dd9b9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'fiscal_periods',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('opened_by_user_id', sa.UUID(), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_by_user_id', sa.UUID(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['closed_by_user_id'], ['users.id'], name=op.f('fk_fiscal_periods_closed_by_user_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['opened_by_user_id'], ['users.id'], name=op.f('fk_fiscal_periods_opened_by_user_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name=op.f('fk_fiscal_periods_tenant_id_tenants'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_fiscal_periods')),
        sa.UniqueConstraint('tenant_id', 'name', name='uq_fiscal_periods_tenant_name'),
    )
    op.create_index(op.f('ix_fiscal_periods_tenant_id'), 'fiscal_periods', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_fiscal_periods_status'), 'fiscal_periods', ['status'], unique=False)
    op.create_index(op.f('ix_fiscal_periods_end_date'), 'fiscal_periods', ['end_date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_fiscal_periods_end_date'), table_name='fiscal_periods')
    op.drop_index(op.f('ix_fiscal_periods_status'), table_name='fiscal_periods')
    op.drop_index(op.f('ix_fiscal_periods_tenant_id'), table_name='fiscal_periods')
    op.drop_table('fiscal_periods')