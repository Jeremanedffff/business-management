"""add payment methods table

Revision ID: 094ce9dd9b9c
Revises: f4c66bb02a65
Create Date: 2026-10-14 15:24:29.957344

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '094ce9dd9b9c'
down_revision: Union[str, None] = 'f4c66bb02a65'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(length=30), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_preferred', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name=op.f('fk_payment_methods_tenant_id_tenants'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_payment_methods')),
    )
    op.create_index(op.f('ix_payment_methods_tenant_id'), 'payment_methods', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_payment_methods_type'), 'payment_methods', ['type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payment_methods_type'), table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_tenant_id'), table_name='payment_methods')
    op.drop_table('payment_methods')