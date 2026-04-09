"""Goals router: CRUD + contribute + progress."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import PlanPermission, get_current_user
from app.models.user import User
from app.schemas.goal import (
    GoalContributionCreate,
    GoalContributionResponse,
    GoalCreate,
    GoalProgressResponse,
    GoalResponse,
    GoalUpdate,
)
from app.services import goal as goal_service

router = APIRouter(prefix="/api/v1/goals", tags=["goals"])


@router.get("/")
async def list_goals(
    goal_status: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    goals, next_cursor = await goal_service.list_goals(
        db, user.id, goal_status, cursor, limit, family_id=ctx.family_id
    )
    return {
        "items": [GoalResponse.model_validate(g) for g in goals],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


@router.get("/emergency-fund-recommendation")
async def emergency_fund_recommendation(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> dict:
    amount = await goal_service.calculate_emergency_fund(db, user.id, family_id=ctx.family_id)
    return {"recommended_amount": amount, "months": 3}


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> GoalResponse:
    goal = await goal_service.get_goal(db, goal_id, user.id, family_id=ctx.family_id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    return GoalResponse.model_validate(goal)


@router.get("/{goal_id}/progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> GoalProgressResponse:
    goal = await goal_service.get_goal(db, goal_id, user.id, family_id=ctx.family_id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    return await goal_service.get_progress(db, goal)


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("goals:manage:create"),
) -> GoalResponse:
    require_permission(ctx, "can_edit_budgets")
    goal = await goal_service.create_goal(db, user.id, data, family_id=ctx.family_id)
    return GoalResponse.model_validate(goal)


@router.post("/{goal_id}/contribute", response_model=GoalContributionResponse, status_code=201)
async def contribute_to_goal(
    goal_id: uuid.UUID,
    data: GoalContributionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
    _perm: None = PlanPermission("goals:contribute:create"),
) -> GoalContributionResponse:
    # Contributing to a goal is a money flow (it creates a real Transaction
    # on the source account), not a structural change to the goal itself.
    # It is the semantic sibling of debts.register_payment, not of
    # goals.update — and must be gated by the same permission as adding any
    # other transaction. The previous can_edit_budgets gate was inconsistent
    # with debts.payment and prevented ADULT family members from contributing
    # to a family goal even though they could pay a family debt.
    require_permission(ctx, "can_add_transactions")
    goal = await goal_service.get_goal(db, goal_id, user.id, family_id=ctx.family_id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    contribution = await goal_service.contribute(
        db, goal, user.id, data.amount, data.note, from_account_id=data.from_account_id
    )
    return GoalContributionResponse.model_validate(contribution)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: uuid.UUID,
    data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> GoalResponse:
    require_permission(ctx, "can_edit_budgets")
    goal = await goal_service.get_goal(db, goal_id, user.id, family_id=ctx.family_id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    updated = await goal_service.update_goal(db, goal, data)
    return GoalResponse.model_validate(updated)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_edit_budgets")
    goal = await goal_service.get_goal(db, goal_id, user.id, family_id=ctx.family_id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    await goal_service.delete_goal(db, goal)
