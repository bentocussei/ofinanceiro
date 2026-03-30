"""Goals router: CRUD + contribute + progress."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
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
) -> dict:
    goals, next_cursor = await goal_service.list_goals(
        db, user.id, goal_status, cursor, limit
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
) -> dict:
    amount = await goal_service.calculate_emergency_fund(db, user.id)
    return {"recommended_amount": amount, "months": 3}


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GoalResponse:
    goal = await goal_service.get_goal(db, goal_id, user.id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    return GoalResponse.model_validate(goal)


@router.get("/{goal_id}/progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GoalProgressResponse:
    goal = await goal_service.get_goal(db, goal_id, user.id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    return await goal_service.get_progress(db, goal)


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GoalResponse:
    goal = await goal_service.create_goal(db, user.id, data)
    return GoalResponse.model_validate(goal)


@router.post("/{goal_id}/contribute", response_model=GoalContributionResponse, status_code=201)
async def contribute_to_goal(
    goal_id: uuid.UUID,
    data: GoalContributionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GoalContributionResponse:
    goal = await goal_service.get_goal(db, goal_id, user.id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    contribution = await goal_service.contribute(db, goal, user.id, data.amount, data.note)
    return GoalContributionResponse.model_validate(contribution)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: uuid.UUID,
    data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GoalResponse:
    goal = await goal_service.get_goal(db, goal_id, user.id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    updated = await goal_service.update_goal(db, goal, data)
    return GoalResponse.model_validate(updated)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    goal = await goal_service.get_goal(db, goal_id, user.id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Meta não encontrada"})
    await goal_service.delete_goal(db, goal)
