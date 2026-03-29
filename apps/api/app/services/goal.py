"""Goal service: CRUD, contribute, progress tracking."""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import GoalStatus, TransactionType
from app.models.goal import Goal, GoalContribution
from app.models.transaction import Transaction
from app.schemas.goal import GoalCreate, GoalProgressResponse, GoalUpdate


async def list_goals(db: AsyncSession, user_id: uuid.UUID, status: str | None = None) -> list[Goal]:
    stmt = select(Goal).where(Goal.user_id == user_id)
    if status:
        stmt = stmt.where(Goal.status == status)
    stmt = stmt.order_by(Goal.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


async def get_goal(db: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID) -> Goal | None:
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_goal(db: AsyncSession, user_id: uuid.UUID, data: GoalCreate) -> Goal:
    goal = Goal(
        user_id=user_id,
        name=data.name,
        type=data.type,
        icon=data.icon,
        color=data.color,
        target_amount=data.target_amount,
        target_date=data.target_date,
        monthly_contribution=data.monthly_contribution,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal, ["contributions"])
    return goal


async def update_goal(db: AsyncSession, goal: Goal, data: GoalUpdate) -> Goal:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    if goal.current_amount >= goal.target_amount and goal.status == GoalStatus.ACTIVE:
        goal.status = GoalStatus.COMPLETED
        goal.completed_at = datetime.now(UTC)
    await db.flush()
    return goal


async def delete_goal(db: AsyncSession, goal: Goal) -> None:
    await db.delete(goal)
    await db.flush()


async def contribute(
    db: AsyncSession, goal: Goal, user_id: uuid.UUID, amount: int, note: str | None = None
) -> GoalContribution:
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
    if goal.monthly_contribution and goal.monthly_contribution > 0 and remaining > 0:
        months_remaining = -(-remaining // goal.monthly_contribution)  # Ceiling division
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
        monthly_contribution=goal.monthly_contribution,
        months_remaining=months_remaining,
        projected_completion=projected_completion,
        contributions=[GoalContributionResponse.model_validate(c) for c in contributions],
    )


async def calculate_emergency_fund(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Calculate recommended emergency fund: 3 months of average expenses."""
    result = await db.execute(
        select(func.coalesce(func.avg(Transaction.amount), 0))
        .where(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
        )
    )
    avg_monthly = (result.scalar() or 0) * 30
    return int(avg_monthly * 3)
