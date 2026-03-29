"""Budgets router: CRUD + status."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.budget import (
    BudgetCreate,
    BudgetResponse,
    BudgetStatusResponse,
    BudgetUpdate,
)
from app.services import budget as budget_service

router = APIRouter(prefix="/api/v1/budgets", tags=["budgets"])


@router.get("/", response_model=list[BudgetResponse])
async def list_budgets(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[BudgetResponse]:
    budgets = await budget_service.list_budgets(db, user.id, active_only)
    return [BudgetResponse.model_validate(b) for b in budgets]


@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetResponse:
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})
    return BudgetResponse.model_validate(budget)


@router.get("/{budget_id}/status", response_model=BudgetStatusResponse)
async def get_budget_status(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetStatusResponse:
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})
    return await budget_service.get_budget_status(db, budget)


@router.post("/", response_model=BudgetResponse, status_code=201)
async def create_budget(
    data: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetResponse:
    budget = await budget_service.create_budget(db, user.id, data)
    return BudgetResponse.model_validate(budget)


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: uuid.UUID,
    data: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetResponse:
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})
    updated = await budget_service.update_budget(db, budget, data)
    return BudgetResponse.model_validate(updated)


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})
    await budget_service.delete_budget(db, budget)
