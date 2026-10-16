"""add tax_categories table and category_id to tax_rates

Revision ID: 033600994902
Revises: 83a3f49a8eb3
Create Date: 2026-09-28 16:36:00.311523

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '033600994902'
down_revision: Union[str, None] = '83a3f49a8eb3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the tax_categories table
    op.create_table(
        'tax_categories',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name=op.f('fk_tax_categories_tenant_id_tenants'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_tax_categories')),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_tax_categories_tenant_code'),
    )
    op.create_index(op.f('ix_tax_categories_name'), 'tax_categories', ['name'], unique=False)
    op.create_index(op.f('ix_tax_categories_tenant_id'), 'tax_categories', ['tenant_id'], unique=False)

    # 2. Add category_id to tax_rates
    op.add_column('tax_rates', sa.Column('category_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_tax_rates_category_id'), 'tax_rates', ['category_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_tax_rates_category_id_tax_categories'),
        'tax_rates',
        'tax_categories',
        ['category_id'],
        ['id'],
        ondelete='SET NULL',
    )

    # 3. Backfill: for each tenant that has existing tax rates, create the
    #    3 standard categories and link the matching rates.
    #
    #    Codes matched:
    #      VAT15     -> STD_VAT     (Standard VAT)
    #      VAT0      -> ZERO_RATED  (Zero Rated)
    #      EXEMPT    -> EXEMPT      (Exempt)

    # 3a. Create categories per tenant
    op.execute("""
        INSERT INTO tax_categories (id, tenant_id, code, name, description, sort_order, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), t.tenant_id, 'STD_VAT', 'Standard VAT', NULL, 0, true, now(), now()
        FROM (SELECT DISTINCT tenant_id FROM tax_rates) t
        WHERE NOT EXISTS (
            SELECT 1 FROM tax_categories tc
            WHERE tc.tenant_id = t.tenant_id AND tc.code = 'STD_VAT'
        )
    """)
    op.execute("""
        INSERT INTO tax_categories (id, tenant_id, code, name, description, sort_order, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), t.tenant_id, 'ZERO_RATED', 'Zero Rated', NULL, 1, true, now(), now()
        FROM (SELECT DISTINCT tenant_id FROM tax_rates) t
        WHERE NOT EXISTS (
            SELECT 1 FROM tax_categories tc
            WHERE tc.tenant_id = t.tenant_id AND tc.code = 'ZERO_RATED'
        )
    """)
    op.execute("""
        INSERT INTO tax_categories (id, tenant_id, code, name, description, sort_order, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), t.tenant_id, 'EXEMPT', 'Exempt', NULL, 2, true, now(), now()
        FROM (SELECT DISTINCT tenant_id FROM tax_rates) t
        WHERE NOT EXISTS (
            SELECT 1 FROM tax_categories tc
            WHERE tc.tenant_id = t.tenant_id AND tc.code = 'EXEMPT'
        )
    """)

    # 3b. Link existing rates to their categories
    op.execute("""
        UPDATE tax_rates tr
        SET category_id = tc.id
        FROM tax_categories tc
        WHERE tr.tenant_id = tc.tenant_id
          AND tc.code = 'STD_VAT'
          AND tr.code = 'VAT15'
          AND tr.category_id IS NULL
    """)
    op.execute("""
        UPDATE tax_rates tr
        SET category_id = tc.id
        FROM tax_categories tc
        WHERE tr.tenant_id = tc.tenant_id
          AND tc.code = 'ZERO_RATED'
          AND tr.code = 'VAT0'
          AND tr.category_id IS NULL
    """)
    op.execute("""
        UPDATE tax_rates tr
        SET category_id = tc.id
        FROM tax_categories tc
        WHERE tr.tenant_id = tc.tenant_id
          AND tc.code = 'EXEMPT'
          AND tr.code = 'EXEMPT'
          AND tr.category_id IS NULL
    """)


def downgrade() -> None:
    op.drop_constraint(op.f('fk_tax_rates_category_id_tax_categories'), 'tax_rates', type_='foreignkey')
    op.drop_index(op.f('ix_tax_rates_category_id'), table_name='tax_rates')
    op.drop_column('tax_rates', 'category_id')
    op.drop_index(op.f('ix_tax_categories_tenant_id'), table_name='tax_categories')
    op.drop_index(op.f('ix_tax_categories_name'), table_name='tax_categories')
    op.drop_table('tax_categories')
