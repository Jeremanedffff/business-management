"""add user invitations table

Revision ID: f4c66bb02a65
Revises: 0b7e4ff182e9
Create Date: 2026-10-13 15:42:58.789487

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4c66bb02a65'
down_revision: Union[str, None] = '0b7e4ff182e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_invitations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('role_id', sa.UUID(), nullable=True),
        sa.Column('invited_by_user_id', sa.UUID(), nullable=True),
        sa.Column('token_hash', sa.String(length=128), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id'], name=op.f('fk_user_invitations_invited_by_user_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], name=op.f('fk_user_invitations_role_id_roles'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name=op.f('fk_user_invitations_tenant_id_tenants'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_invitations')),
    )
    op.create_index(op.f('ix_user_invitations_email'), 'user_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_user_invitations_expires_at'), 'user_invitations', ['expires_at'], unique=False)
    op.create_index(op.f('ix_user_invitations_invited_by_user_id'), 'user_invitations', ['invited_by_user_id'], unique=False)
    op.create_index(op.f('ix_user_invitations_role_id'), 'user_invitations', ['role_id'], unique=False)
    op.create_index(op.f('ix_user_invitations_tenant_id'), 'user_invitations', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_user_invitations_token_hash'), 'user_invitations', ['token_hash'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_invitations_token_hash'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_tenant_id'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_role_id'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_invited_by_user_id'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_expires_at'), table_name='user_invitations')
    op.drop_index(op.f('ix_user_invitations_email'), table_name='user_invitations')
    op.drop_table('user_invitations')