"""Context-aware SQL filter helpers shared by every agent tool.

Every agent that touches the database has a tool method like
``_get_balance(ctx)`` or ``_add_transaction(args, ctx)``. The naive
filter ``Account.user_id == ctx.user_id`` is wrong as soon as the
caller is in family context — the user is logged in as themselves,
but the account they're acting on (e.g. ``Conta Família``) is owned
by another family member with the same family_id.

The router/service layer of the REST API already gets this right
(see ``services/account.list_accounts`` for the canonical pattern).
Agent tools were missing the same branching, so the chat could
"see" a family account through the orchestrator's snapshot but then
fail with "conta não encontrada" when it tried to use it.

These helpers centralise the rule so every tool query is one call
away from being context-correct, and any future agent inherits the
right behaviour by default.

Usage::

    stmt = select(Account).where(Account.id == account_id)
    stmt = scope_to_context(stmt, Account, ctx)
    account = (await ctx.db.execute(stmt)).scalar_one_or_none()

For ``Transaction`` (which has no ``family_id`` of its own — the
context lives on the joined account row) use the dedicated helper::

    stmt = select(Transaction).join(Account, Transaction.account_id == Account.id)
    stmt = scope_transactions_to_context(stmt, ctx)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Select

from app.models.account import Account
from app.models.transaction import Transaction

if TYPE_CHECKING:
    from app.ai.agents.base import AgentContext


def scope_to_context(stmt: Select, model, ctx: "AgentContext") -> Select:
    """Restrict a SELECT to the rows visible in the agent's current context.

    ``model`` must expose ``user_id`` and ``family_id`` columns. Works for
    Account, Goal, Debt, Investment, Budget, Asset, Bill, RecurringRule.

        - family context  → rows where ``model.family_id == ctx.family_id``
        - personal        → rows where ``model.user_id == ctx.user_id`` AND
                            ``model.family_id IS NULL``
    """
    if ctx.family_id is not None:
        return stmt.where(model.family_id == ctx.family_id)
    return stmt.where(model.user_id == ctx.user_id, model.family_id.is_(None))


def scope_transactions_to_context(stmt: Select, ctx: "AgentContext") -> Select:
    """Restrict a Transaction SELECT to the current context.

    Transaction has no direct family_id column — the context is derived
    from the joined Account. The caller is responsible for adding
    ``.join(Account, Transaction.account_id == Account.id)`` first.
    """
    if ctx.family_id is not None:
        return stmt.where(Account.family_id == ctx.family_id)
    return stmt.where(
        Transaction.user_id == ctx.user_id,
        Account.family_id.is_(None),
    )
