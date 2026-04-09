"""Goal service: CRUD, contribute, progress tracking."""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import GoalStatus, TransactionType
from app.models.goal import Goal, GoalContribution
from app.models.transaction import Transaction
from app.schemas.goal import GoalCreate, GoalProgressResponse, GoalUpdate


async def list_goals(
    db: AsyncSession,
    user_id: uuid.UUID,
    status: str | None = None,
    cursor: str | None = None,
    limit: int = 50,
    family_id: uuid.UUID | None = None,
) -> tuple[list[Goal], str | None]:
    """List goals with cursor-based pagination.
    Returns (goals, next_cursor).
    """
    stmt = select(Goal)
    if family_id is not None:
        stmt = stmt.where(Goal.family_id == family_id)
    else:
        stmt = stmt.where(Goal.user_id == user_id, Goal.family_id.is_(None))
    if status:
        stmt = stmt.where(Goal.status == status)
    if cursor:
        cursor_uuid = uuid.UUID(cursor)
        stmt = stmt.where(Goal.id < cursor_uuid)
    stmt = stmt.order_by(Goal.created_at.desc(), Goal.id.desc())
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    goals = list(result.scalars().unique().all())

    next_cursor = None
    if len(goals) > limit:
        goals = goals[:limit]
        next_cursor = str(goals[-1].id)

    return goals, next_cursor


async def get_goal(
    db: AsyncSession,
    goal_id: uuid.UUID,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> Goal | None:
    stmt = select(Goal).where(Goal.id == goal_id)
    if family_id is not None:
        stmt = stmt.where(Goal.family_id == family_id)
    else:
        stmt = stmt.where(Goal.user_id == user_id, Goal.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_goal(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: GoalCreate,
    family_id: uuid.UUID | None = None,
) -> Goal:
    goal = Goal(
        user_id=user_id,
        family_id=family_id,
        name=data.name,
        type=data.type,
        icon=data.icon,
        color=data.color,
        target_amount=data.target_amount,
        target_date=data.target_date,
        contribution_amount=data.contribution_amount,
        contribution_frequency=data.contribution_frequency,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal, ["contributions"])
    return goal


async def update_goal(db: AsyncSession, goal: Goal, data: GoalUpdate) -> Goal:
    """Update a goal and keep its status consistent with the target.

    Goals are aspirational — over-saving past the target is allowed (the
    user can keep contributing to a "completed" emergency fund). What we
    must keep consistent is the **status** field relative to current vs
    target amount, in BOTH directions:

        current >= target  → COMPLETED
        current <  target  → ACTIVE   (re-activate from COMPLETED)

    Without the symmetric branch, raising the target back above current
    after a goal was auto-completed would leave the goal stuck in
    COMPLETED with progress < 100%.
    """
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    if goal.current_amount >= goal.target_amount and goal.status == GoalStatus.ACTIVE:
        goal.status = GoalStatus.COMPLETED
        goal.completed_at = datetime.now(UTC)
    elif goal.current_amount < goal.target_amount and goal.status == GoalStatus.COMPLETED:
        goal.status = GoalStatus.ACTIVE
        goal.completed_at = None

    await db.flush()
    return goal


async def delete_goal(db: AsyncSession, goal: Goal) -> None:
    """Delete a goal and clear provenance from any contribution transactions.

    goal_contributions cascade-delete via the FK, but the user-visible
    `transactions` rows that were created when contributions were made
    have `source_type='goal_contribution'` and `source_id=goal.id`.
    Without this cleanup those references would dangle silently. Mirror
    of the same fix in services/debt.delete_debt.
    """
    from sqlalchemy import update as sa_update

    await db.execute(
        sa_update(Transaction)
        .where(
            Transaction.source_type == "goal_contribution",
            Transaction.source_id == goal.id,
        )
        .values(source_type=None, source_id=None)
    )
    await db.delete(goal)
    await db.flush()


async def contribute(
    db: AsyncSession,
    goal: Goal,
    user_id: uuid.UUID,
    amount: int,
    note: str | None = None,
    from_account_id: uuid.UUID | None = None,
) -> GoalContribution:
    # Verify from_account_id is reachable from the goal's context. A family
    # goal must accept any account belonging to the same family (so any member
    # can contribute), not only accounts owned by the calling user.
    if from_account_id:
        from sqlalchemy import select as sa_select
        acct_stmt = sa_select(Account).where(Account.id == from_account_id)
        if goal.family_id is not None:
            acct_stmt = acct_stmt.where(Account.family_id == goal.family_id)
        else:
            acct_stmt = acct_stmt.where(
                Account.user_id == user_id, Account.family_id.is_(None)
            )
        acct_result = await db.execute(acct_stmt)
        if not acct_result.scalar_one_or_none():
            from fastapi import HTTPException, status as http_status
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")

    # Concurrency: re-fetch the goal with a row-level lock so two
    # simultaneous contributions on the same goal serialize. Same fix
    # as services/debt.register_payment — without it both branches
    # would read the same current_amount and each write current+amount,
    # losing one contribution. Locks taken in fixed order: goal then
    # account, to keep deadlock-free with any concurrent operation.
    # populate_existing=True forces a fresh attribute read on the locked
    # row even when the session already cached the instance.
    locked_goal = await db.execute(
        select(Goal)
        .where(Goal.id == goal.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    goal = locked_goal.scalar_one()

    # Determine the source account: explicit param > goal's savings_account_id
    account_id = from_account_id or goal.savings_account_id

    # If there's a linked account, debit it and create a transaction
    if account_id:
        locked_acc = await db.execute(
            select(Account)
            .where(Account.id == account_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        account = locked_acc.scalar_one_or_none()
        if account:
            account.balance -= amount

            txn = Transaction(
                user_id=user_id,
                account_id=account_id,
                amount=amount,
                type=TransactionType.EXPENSE,
                description=f"Contribuição: {goal.name}",
                transaction_date=date.today(),
                source_type="goal_contribution",
                source_id=goal.id,
            )
            db.add(txn)

    contribution = GoalContribution(
        goal_id=goal.id,
        user_id=user_id,
        amount=amount,
        note=note,
    )
    db.add(contribution)
    goal.current_amount += amount

    if goal.current_amount >= goal.target_amount and goal.status == GoalStatus.ACTIVE:
        goal.status = GoalStatus.COMPLETED
        goal.completed_at = datetime.now(UTC)

    await db.flush()
    return contribution


async def get_progress(db: AsyncSession, goal: Goal) -> GoalProgressResponse:
    remaining = max(0, goal.target_amount - goal.current_amount)
    percentage = round((goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0, 1)

    months_remaining = None
    projected_completion = None
    if goal.contribution_amount and goal.contribution_amount > 0 and remaining > 0:
        months_remaining = -(-remaining // goal.contribution_amount)  # Ceiling division
        projected_completion = date.today() + timedelta(days=months_remaining * 30)

    # Get contribution history
    result = await db.execute(
        select(GoalContribution)
        .where(GoalContribution.goal_id == goal.id)
        .order_by(GoalContribution.contributed_at.desc())
        .limit(20)
    )
    contributions = list(result.scalars().all())

    from app.schemas.goal import GoalContributionResponse

    return GoalProgressResponse(
        goal_id=goal.id,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        remaining=remaining,
        percentage=percentage,
        contribution_amount=goal.contribution_amount,
        months_remaining=months_remaining,
        projected_completion=projected_completion,
        contributions=[GoalContributionResponse.model_validate(c) for c in contributions],
    )


async def calculate_emergency_fund(
    db: AsyncSession,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
) -> int:
    """Calculate recommended emergency fund: 3 months of average expenses."""
    stmt = (
        select(func.coalesce(func.avg(Transaction.amount), 0))
        .join(Account, Transaction.account_id == Account.id)
        .where(Transaction.type == TransactionType.EXPENSE)
    )
    if family_id is not None:
        stmt = stmt.where(Account.family_id == family_id)
    else:
        stmt = stmt.where(Transaction.user_id == user_id, Account.family_id.is_(None))
    result = await db.execute(stmt)
    avg_monthly = (result.scalar() or 0) * 30
    return int(avg_monthly * 3)
