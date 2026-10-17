"""Align invoice persistence fields with the active invoice workflow.

Revision ID: c7f3a12b9e45
Revises: 8d6b3d2a4f10
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op


revision: str = "c7f3a12b9e45"
down_revision: Union[str, None] = "8d6b3d2a4f10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            legacy_column text;
            contains_data boolean;
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'invoices'
                  AND column_name = 'document_type'
            ) THEN
                ALTER TABLE invoices ADD COLUMN document_type VARCHAR(20);
            END IF;

            UPDATE invoices
            SET document_type = 'FiscalInvoice'
            WHERE document_type IS NULL;

            ALTER TABLE invoices
                ALTER COLUMN document_type SET DEFAULT 'FiscalInvoice',
                ALTER COLUMN document_type SET NOT NULL;

            FOREACH legacy_column IN ARRAY ARRAY[
                'credit_debit_note',
                'credited_invoice_number',
                'original_invoice_id'
            ]
            LOOP
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'invoices'
                      AND column_name = legacy_column
                ) THEN
                    EXECUTE format(
                        'SELECT EXISTS (SELECT 1 FROM invoices WHERE %I IS NOT NULL)',
                        legacy_column
                    ) INTO contains_data;

                    IF contains_data THEN
                        RAISE EXCEPTION
                            'Cannot remove invoices.% because it contains stored data',
                            legacy_column;
                    END IF;

                    EXECUTE format(
                        'ALTER TABLE invoices DROP COLUMN %I',
                        legacy_column
                    );
                END IF;
            END LOOP;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE invoices
            ADD COLUMN IF NOT EXISTS credit_debit_note TEXT,
            ADD COLUMN IF NOT EXISTS credited_invoice_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS original_invoice_id UUID;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = 'invoices'::regclass
                  AND contype = 'f'
                  AND conname = 'fk_invoices_original_invoice_id'
            ) THEN
                ALTER TABLE invoices
                    ADD CONSTRAINT fk_invoices_original_invoice_id
                    FOREIGN KEY (original_invoice_id)
                    REFERENCES invoices (id)
                    ON DELETE SET NULL;
            END IF;
        END
        $$;
        """
    )
