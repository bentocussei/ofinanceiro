"""Budgets router: CRUD + status."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import FinanceContext, get_context, require_permission
from app.database import get_db
from app.dependencies import get_current_user
from app.models.budget import BudgetItem
from app.models.user import User
from app.schemas.budget import (
    BudgetCreate,
    BudgetItemCreate,
    BudgetItemResponse,
    BudgetItemUpdate,
    BudgetResponse,
    BudgetStatusResponse,
    BudgetUpdate,
)
from app.services import budget as budget_service

router = APIRouter(prefix="/api/v1/budgets", tags=["budgets"])


@router.get("/")
async def list_budgets(
    active_only: bool = True,
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    budgets, next_cursor = await budget_service.list_budgets(
        db, user.id, active_only, cursor, limit
    )
    return {
        "items": [BudgetResponse.model_validate(b) for b in budgets],
        "cursor": next_cursor,
        "has_more": next_cursor is not None,
    }


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
    ctx: FinanceContext = Depends(get_context),
) -> BudgetResponse:
    require_permission(ctx, "can_edit_budgets")
    budget = await budget_service.create_budget(db, user.id, data)
    return BudgetResponse.model_validate(budget)


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: uuid.UUID,
    data: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> BudgetResponse:
    require_permission(ctx, "can_edit_budgets")
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
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_edit_budgets")
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})
    await budget_service.delete_budget(db, budget)


@router.post("/{budget_id}/items", response_model=BudgetItemResponse, status_code=201)
async def create_budget_item(
    budget_id: uuid.UUID,
    data: BudgetItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> BudgetItemResponse:
    require_permission(ctx, "can_edit_budgets")
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})

    # Verificar se já existe item para esta categoria
    existing = await db.execute(
        select(BudgetItem).where(
            BudgetItem.budget_id == budget_id,
            BudgetItem.category_id == data.category_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "DUPLICATE", "message": "Já existe um item para esta categoria neste orçamento"},
        )

    item = BudgetItem(
        budget_id=budget_id,
        category_id=data.category_id,
        limit_amount=data.limit_amount,
    )
    db.add(item)
    await db.flush()
    return BudgetItemResponse.model_validate(item)


@router.put("/{budget_id}/items/{item_id}", response_model=BudgetItemResponse)
async def update_budget_item(
    budget_id: uuid.UUID,
    item_id: uuid.UUID,
    data: BudgetItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> BudgetItemResponse:
    require_permission(ctx, "can_edit_budgets")
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})

    result = await db.execute(
        select(BudgetItem).where(BudgetItem.id == item_id, BudgetItem.budget_id == budget_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Item não encontrado"})

    item.limit_amount = data.limit_amount
    await db.flush()
    return BudgetItemResponse.model_validate(item)


@router.delete("/{budget_id}/items/{item_id}", status_code=204)
async def delete_budget_item(
    budget_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    ctx: FinanceContext = Depends(get_context),
) -> None:
    require_permission(ctx, "can_edit_budgets")
    budget = await budget_service.get_budget(db, budget_id, user.id)
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Orçamento não encontrado"})

    result = await db.execute(
        select(BudgetItem).where(BudgetItem.id == item_id, BudgetItem.budget_id == budget_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Item não encontrado"})

    await db.delete(item)
    await db.flush()
