"""Snapshots router: listar e gerar resumos financeiros periódicos."""

import logging
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.account import Account
from app.models.debt import Debt
from app.models.enums import SnapshotPeriodType, TransactionType
from app.models.finance_snapshot import FinanceSnapshot
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/snapshots", tags=["snapshots"])


@router.get("/")
async def list_snapshots(
    period_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(FinanceSnapshot).where(FinanceSnapshot.user_id == user.id)
    if period_type is not None:
        stmt = stmt.where(FinanceSnapshot.period_type == period_type)
    stmt = stmt.order_by(FinanceSnapshot.period.desc())
    result = await db.execute(stmt)
    snapshots = result.scalars().all()
    return [_to_dict(s) for s in snapshots]


@router.post("/generate", status_code=201)
async def generate_snapshot(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> dict:
    """Gerar snapshot do mês corrente.

    - Com SERVICE_TOKEN: gera para TODOS os utilizadores activos (cron job).
    - Com JWT de utilizador: gera apenas para esse utilizador.
    - Sem autenticação válida: retorna 401.
    """
    service_token = request.headers.get("X-Service-Token") or ""
    has_valid_service_token = (
        bool(settings.service_token) and service_token == settings.service_token
    )

    if has_valid_service_token:
        logger.info("Geração de snapshots via cron (todos os utilizadores)")
        return await _generate_all_snapshots(db)

    if user is not None:
        logger.info("Geração de snapshot para utilizador %s", user.id)
        snapshot = await _generate_snapshot_for_user(db, user.id)
        return _to_dict(snapshot)

    raise HTTPException(status_code=401, detail="Autenticação necessária")


async def _generate_all_snapshots(db: AsyncSession) -> dict:
    """Gerar snapshots para todos os utilizadores activos."""
    result = await db.execute(select(User.id).where(User.is_active.is_(True)))
    user_ids = [row[0] for row in result.all()]

    generated = 0
    for user_id in user_ids:
        await _generate_snapshot_for_user(db, user_id)
        generated += 1

    await db.flush()
    logger.info("Snapshots gerados para %d utilizadores", generated)
    return {"users_processed": generated, "period": date.today().strftime("%Y-%m")}


async def _generate_snapshot_for_user(
    db: AsyncSession, user_id: uuid.UUID
) -> FinanceSnapshot:
    """Gerar snapshot mensal para um utilizador específico."""
    today = date.today()
    period = today.strftime("%Y-%m")
    month_start = today.replace(day=1)

    # Rendimentos do mês
    income_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.INCOME,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= today,
    )
    total_income = (await db.execute(income_stmt)).scalar() or 0

    # Despesas do mês
    expense_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.EXPENSE,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= today,
    )
    total_expense = (await db.execute(expense_stmt)).scalar() or 0

    # Saldo total das contas
    balance_stmt = select(func.coalesce(func.sum(Account.balance), 0)).where(
        Account.user_id == user_id,
        Account.is_archived == False,  # noqa: E712
    )
    total_balance = (await db.execute(balance_stmt)).scalar() or 0

    # Dívida total activa
    debt_stmt = select(func.coalesce(func.sum(Debt.current_balance), 0)).where(
        Debt.user_id == user_id,
        Debt.is_active == True,  # noqa: E712
    )
    total_debt = (await db.execute(debt_stmt)).scalar() or 0

    # Total em metas de poupança
    savings_stmt = select(func.coalesce(func.sum(Goal.current_amount), 0)).where(
        Goal.user_id == user_id,
    )
    total_savings = (await db.execute(savings_stmt)).scalar() or 0

    net_savings = total_income - total_expense
    net_worth = total_balance - total_debt

    # Upsert: actualizar se já existir
    existing_stmt = select(FinanceSnapshot).where(
        FinanceSnapshot.user_id == user_id,
        FinanceSnapshot.period == period,
        FinanceSnapshot.period_type == SnapshotPeriodType.MONTHLY,
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()

    if existing:
        snapshot = existing
        snapshot.total_income = total_income
        snapshot.total_expense = total_expense
        snapshot.net_savings = net_savings
        snapshot.total_balance = total_balance
        snapshot.total_debt = total_debt
        snapshot.total_savings = total_savings
        snapshot.net_worth = net_worth
    else:
        snapshot = FinanceSnapshot(
            user_id=user_id,
            period=period,
            period_type=SnapshotPeriodType.MONTHLY,
            total_income=total_income,
            total_expense=total_expense,
            net_savings=net_savings,
            total_balance=total_balance,
            total_debt=total_debt,
            total_savings=total_savings,
            net_worth=net_worth,
        )
        db.add(snapshot)

    await db.flush()
    await db.refresh(snapshot)
    return snapshot


def _to_dict(snapshot: FinanceSnapshot) -> dict:
    return {
        "id": snapshot.id,
        "user_id": snapshot.user_id,
        "family_id": snapshot.family_id,
        "period": snapshot.period,
        "period_type": snapshot.period_type,
        "total_income": snapshot.total_income,
        "total_expense": snapshot.total_expense,
        "net_savings": snapshot.net_savings,
        "total_balance": snapshot.total_balance,
        "total_debt": snapshot.total_debt,
        "total_savings": snapshot.total_savings,
        "net_worth": snapshot.net_worth,
        "expense_by_category": snapshot.expense_by_category,
        "income_by_source": snapshot.income_by_source,
        "health_score": snapshot.health_score,
        "created_at": snapshot.created_at,
        "updated_at": snapshot.updated_at,
    }
