"""repair debt balance invariants

Repairs any rows in the `debts` table where the relationship between
`original_amount`, `current_balance` and the sum of registered payments
is inconsistent.

Background: prior to ADR-012 the `update_debt` service did a naive
setattr loop. Editing `original_amount` left `current_balance` untouched,
producing impossible states (e.g. balance > original → "-100% pago" with
the progress bar full). This migration repairs any such rows so the
new invariant-enforcing `update_debt` can rely on a clean baseline.

Recovery rules (deterministic, no user input):

    Let total_paid = SUM(debt_payments.amount WHERE debt_id = d.id)

    1. total_paid == 0
       → current_balance := original_amount
         (the canonical "no payments yet" state)

    2. total_paid > 0 AND original_amount >= total_paid
       → current_balance := original_amount - total_paid
         (re-derive balance from history of payments)

    3. total_paid > 0 AND original_amount < total_paid
       → original_amount := current_balance + total_paid
         (preserve the user-visible current_balance and reconstruct
          the original principal so that the invariant holds)

Idempotent: rows that already satisfy the invariant are untouched.

Revision ID: a1c4e2f9b8d3
Revises: 58cbe0aab963
Create Date: 2026-04-09
"""
from typing import Sequence, Union

from alembic import op


revision: str = "a1c4e2f9b8d3"
down_revision: Union[str, Sequence[str], None] = "58cbe0aab963"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use a single CTE so the repair is atomic and visible in the same statement.
    op.execute(
        """
        WITH paid AS (
            SELECT d.id,
                   d.original_amount,
                   d.current_balance,
                   COALESCE(
                       (SELECT SUM(amount) FROM debt_payments WHERE debt_id = d.id),
                       0
                   ) AS total_paid
            FROM debts d
        ),
        repair AS (
            SELECT
                id,
                CASE
                    WHEN total_paid = 0 THEN original_amount
                    WHEN total_paid > 0 AND original_amount >= total_paid THEN original_amount
                    ELSE current_balance + total_paid  -- rule 3
                END AS new_original,
                CASE
                    WHEN total_paid = 0 THEN original_amount
                    WHEN total_paid > 0 AND original_amount >= total_paid THEN original_amount - total_paid
                    ELSE current_balance  -- rule 3 keeps balance, rebuilds original
                END AS new_balance
            FROM paid
        )
        UPDATE debts d
        SET original_amount = r.new_original,
            current_balance = r.new_balance,
            -- Re-evaluate paid_off / active flags from the corrected balance
            is_paid_off = (r.new_balance <= 0),
            is_active   = (r.new_balance > 0)
        FROM repair r
        WHERE d.id = r.id
          AND (
                d.original_amount IS DISTINCT FROM r.new_original
             OR d.current_balance IS DISTINCT FROM r.new_balance
          );
        """
    )


def downgrade() -> None:
    # Data repair — no automatic rollback (we cannot reconstruct the broken
    # state, and we wouldn't want to).
    pass
