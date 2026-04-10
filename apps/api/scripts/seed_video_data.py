#!/usr/bin/env python3
"""
Seed complementar para vídeos de demonstração.

Adiciona dados realistas em cima do seed_demo existente para que cada
página e cada cenário de vídeo tenha conteúdo visual apelativo.

Não substitui seed_demo — corre DEPOIS dele.
Idempotente: verifica existência antes de criar.

Uso:
    cd apps/api
    .venv/bin/python scripts/seed_video_data.py
"""

import asyncio
import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Bootstrap
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.goal import Goal, GoalContribution
from app.models.asset import Asset
from app.models.enums import TransactionType, GoalStatus, CurrencyCode

DATABASE_URL = settings.database_url
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Known IDs from seed_demo
CUSSEI_ID = uuid.UUID("14d84ad8-cebf-4240-ad65-0275522c55e1")
ANA_ID = uuid.UUID("cd997bee-688a-4630-ab8d-69c1f7046977")
FAMILY_ID = uuid.UUID("175add0a-7615-4666-8afe-c48b7a156272")


async def get_account_id(db, user_id, name_contains, family_id=None):
    """Find an account by partial name match."""
    stmt = select(Account.id).where(Account.name.ilike(f"%{name_contains}%"))
    if family_id:
        stmt = stmt.where(Account.family_id == family_id)
    else:
        stmt = stmt.where(Account.user_id == user_id, Account.family_id.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_category_id(db, name):
    """Find a system category by name."""
    from app.models.category import Category
    result = await db.execute(
        select(Category.id).where(Category.name == name, Category.is_system.is_(True))
    )
    return result.scalar_one_or_none()


async def has_data(db, model, **filters):
    """Check if a row matching the filters exists."""
    stmt = select(model.id)
    for k, v in filters.items():
        stmt = stmt.where(getattr(model, k) == v)
    result = await db.execute(stmt.limit(1))
    return result.scalar_one_or_none() is not None


async def seed_ana_transactions(db):
    """Add 15+ personal transactions for Ana."""
    ana_bai = await get_account_id(db, ANA_ID, "BAI")
    ana_carteira = await get_account_id(db, ANA_ID, "Carteira")
    if not ana_bai:
        print("  SKIP: Ana BAI account not found")
        return

    # Check if already seeded
    existing = await db.execute(
        select(Transaction.id).where(
            Transaction.user_id == ANA_ID,
            Transaction.description == "Salário Abril"
        ).limit(1)
    )
    if existing.scalar_one_or_none():
        print("  SKIP: Ana transactions already seeded")
        return

    cat_alimentacao = await get_category_id(db, "Alimentação")
    cat_transporte = await get_category_id(db, "Candongueiro / Kupapata")
    cat_agua = await get_category_id(db, "Água (EPAL)")
    cat_luz = await get_category_id(db, "Electricidade (ENDE)")
    cat_educacao = await get_category_id(db, "Educação")
    cat_saude = await get_category_id(db, "Saúde / Farmácia")
    cat_beleza = await get_category_id(db, "Cabeleireiro / Estética")

    today = date.today()
    txns = [
        # Receita
        (ana_bai, 25000000, "INCOME", "Salário Abril", None, today.replace(day=5)),
        # Alimentação
        (ana_bai, 450000, "EXPENSE", "Zungueira semanal", cat_alimentacao, today - timedelta(days=2)),
        (ana_bai, 450000, "EXPENSE", "Zungueira semanal", cat_alimentacao, today - timedelta(days=9)),
        (ana_bai, 450000, "EXPENSE", "Zungueira semanal", cat_alimentacao, today - timedelta(days=16)),
        (ana_bai, 450000, "EXPENSE", "Zungueira semanal", cat_alimentacao, today - timedelta(days=23)),
        (ana_bai, 1200000, "EXPENSE", "Supermercado Kero", cat_alimentacao, today - timedelta(days=3)),
        (ana_bai, 800000, "EXPENSE", "Mercado do Benfica", cat_alimentacao, today - timedelta(days=10)),
        (ana_bai, 500000, "EXPENSE", "Fruta e legumes", cat_alimentacao, today - timedelta(days=17)),
        # Transporte
        (ana_carteira or ana_bai, 50000, "EXPENSE", "Candongueiro Viana-Mutamba", cat_transporte, today - timedelta(days=1)),
        (ana_carteira or ana_bai, 50000, "EXPENSE", "Candongueiro Mutamba-Viana", cat_transporte, today - timedelta(days=1)),
        (ana_carteira or ana_bai, 100000, "EXPENSE", "Candongueiro x2", cat_transporte, today - timedelta(days=4)),
        (ana_carteira or ana_bai, 150000, "EXPENSE", "Kupapata até escola", cat_transporte, today - timedelta(days=7)),
        (ana_carteira or ana_bai, 50000, "EXPENSE", "Candongueiro", cat_transporte, today - timedelta(days=12)),
        # Utilidades
        (ana_bai, 320000, "EXPENSE", "Factura EPAL - Março", cat_agua, today - timedelta(days=5)),
        (ana_bai, 850000, "EXPENSE", "Factura ENDE - Março", cat_luz, today - timedelta(days=8)),
        # Educação
        (ana_bai, 2500000, "EXPENSE", "Propina escola filhos - Abril", cat_educacao, today.replace(day=3)),
        # Saúde
        (ana_bai, 350000, "EXPENSE", "Farmácia — paracetamol e vitaminas", cat_saude, today - timedelta(days=6)),
        # Beleza
        (ana_bai, 800000, "EXPENSE", "Cabeleireiro — tranças", cat_beleza, today - timedelta(days=14)),
    ]

    total_expense = 0
    for acc_id, amount, txn_type, desc, cat_id, txn_date in txns:
        txn = Transaction(
            user_id=ANA_ID,
            account_id=acc_id,
            amount=amount,
            type=TransactionType(txn_type.lower()),
            description=desc,
            category_id=cat_id,
            transaction_date=txn_date,
            source_type="seed_video",
        )
        db.add(txn)
        # Update account balance
        account = await db.get(Account, acc_id)
        if account:
            if txn_type == "INCOME":
                account.balance += amount
            else:
                account.balance -= amount
                total_expense += amount

    await db.flush()
    print(f"  Created {len(txns)} transactions for Ana (total expense: {total_expense/100:,.0f} Kz)")


async def seed_ana_goal(db):
    """Add 1 personal goal for Ana."""
    existing = await has_data(db, Goal, user_id=ANA_ID, name="Poupança para emergência")
    if existing:
        print("  SKIP: Ana goal already exists")
        return

    goal = Goal(
        user_id=ANA_ID,
        family_id=None,
        name="Poupança para emergência",
        type="emergency",
        target_amount=50000000,  # 500K Kz
        current_amount=8000000,  # 80K Kz (16%)
        contribution_amount=2000000,  # 20K/mês
        contribution_frequency="monthly",
        status=GoalStatus.ACTIVE,
    )
    db.add(goal)
    await db.flush()

    # Add a couple of contributions
    for i, (amount, days_ago) in enumerate([(3000000, 30), (5000000, 5)]):
        contrib = GoalContribution(
            goal_id=goal.id,
            user_id=ANA_ID,
            amount=amount,
            note=f"Contribuição {'inicial' if i == 0 else 'mensal'}",
            contributed_at=date.today() - timedelta(days=days_ago),
        )
        db.add(contrib)

    print("  Created goal 'Poupança para emergência' for Ana (16%)")


async def seed_cussei_extra_goal(db):
    """Add 'Fundo de emergência' goal for Cussei if missing."""
    existing = await has_data(db, Goal, user_id=CUSSEI_ID, name="Fundo de emergência")
    if existing:
        print("  SKIP: Cussei 'Fundo de emergência' already exists")
        return

    goal = Goal(
        user_id=CUSSEI_ID,
        family_id=None,
        name="Fundo de emergência",
        type="emergency",
        target_amount=300000000,  # 3M Kz
        current_amount=180000000,  # 1.8M Kz (60%)
        contribution_amount=10000000,  # 100K/mês
        contribution_frequency="monthly",
        status=GoalStatus.ACTIVE,
    )
    db.add(goal)
    await db.flush()

    # Add contributions history
    for i in range(6):
        contrib = GoalContribution(
            goal_id=goal.id,
            user_id=CUSSEI_ID,
            amount=30000000,
            note=f"Contribuição mês {i+1}",
            contributed_at=date.today() - timedelta(days=30 * (6 - i)),
        )
        db.add(contrib)

    print("  Created goal 'Fundo de emergência' for Cussei (60%)")


async def seed_family_extra_transactions(db):
    """Add more diverse family transactions."""
    fam_acc = await get_account_id(db, CUSSEI_ID, "Família", family_id=FAMILY_ID)
    if not fam_acc:
        print("  SKIP: Family account not found")
        return

    existing = await db.execute(
        select(Transaction.id).where(
            Transaction.description == "Empregada doméstica - Abril"
        ).limit(1)
    )
    if existing.scalar_one_or_none():
        print("  SKIP: Family extra transactions already seeded")
        return

    cat_alimentacao = await get_category_id(db, "Alimentação")
    cat_educacao = await get_category_id(db, "Educação")
    cat_gas = await get_category_id(db, "Gás")
    cat_agua = await get_category_id(db, "Água (EPAL)")
    cat_luz = await get_category_id(db, "Electricidade (ENDE)")
    cat_empregada = await get_category_id(db, "Empregada doméstica")
    cat_manutencao = await get_category_id(db, "Manutenção / Reparações")
    cat_tv = await get_category_id(db, "TV / Streaming")

    today = date.today()
    txns = [
        # By Cussei
        (CUSSEI_ID, 3500000, "EXPENSE", "Empregada doméstica - Abril", cat_empregada, today.replace(day=1)),
        (CUSSEI_ID, 1500000, "EXPENSE", "DSTV Premium - Abril", cat_tv, today.replace(day=2)),
        (CUSSEI_ID, 450000, "EXPENSE", "Factura EPAL família", cat_agua, today - timedelta(days=5)),
        (CUSSEI_ID, 1200000, "EXPENSE", "Factura ENDE família", cat_luz, today - timedelta(days=5)),
        (CUSSEI_ID, 1800000, "EXPENSE", "Supermercado Shoprite", cat_alimentacao, today - timedelta(days=3)),
        (CUSSEI_ID, 1200000, "EXPENSE", "Botija de gás", cat_gas, today - timedelta(days=8)),
        # By Ana
        (ANA_ID, 1500000, "EXPENSE", "Mercado para casa", cat_alimentacao, today - timedelta(days=2)),
        (ANA_ID, 800000, "EXPENSE", "Legumes e fruta família", cat_alimentacao, today - timedelta(days=6)),
        (ANA_ID, 2000000, "EXPENSE", "Material escolar filhos", cat_educacao, today - timedelta(days=4)),
    ]

    for user_id, amount, txn_type, desc, cat_id, txn_date in txns:
        txn = Transaction(
            user_id=user_id,
            account_id=fam_acc,
            amount=amount,
            type=TransactionType(txn_type.lower()),
            description=desc,
            category_id=cat_id,
            transaction_date=txn_date,
            source_type="seed_video",
        )
        db.add(txn)
        account = await db.get(Account, fam_acc)
        if account:
            account.balance -= amount

    await db.flush()
    print(f"  Created {len(txns)} extra family transactions")


async def seed_family_extra_goal(db):
    """Add 'Fundo escolar' family goal."""
    existing = await has_data(db, Goal, family_id=FAMILY_ID, name="Fundo escolar")
    if existing:
        print("  SKIP: Family 'Fundo escolar' already exists")
        return

    goal = Goal(
        user_id=CUSSEI_ID,
        family_id=FAMILY_ID,
        name="Fundo escolar",
        type="education",
        target_amount=200000000,  # 2M Kz
        current_amount=60000000,  # 600K (30%)
        contribution_amount=5000000,  # 50K/mês
        contribution_frequency="monthly",
        status=GoalStatus.ACTIVE,
    )
    db.add(goal)
    await db.flush()

    for i in range(4):
        contrib = GoalContribution(
            goal_id=goal.id,
            user_id=CUSSEI_ID if i % 2 == 0 else ANA_ID,
            amount=15000000,
            note=f"Contribuição mês {i+1}",
            contributed_at=date.today() - timedelta(days=30 * (4 - i)),
        )
        db.add(contrib)

    print("  Created family goal 'Fundo escolar' (30%)")


async def seed_family_extra_asset(db):
    """Add 'Electrodomésticos' family asset."""
    existing = await has_data(db, Asset, family_id=FAMILY_ID, name="Electrodomésticos")
    if existing:
        print("  SKIP: Family 'Electrodomésticos' asset already exists")
        return

    from app.models.enums import AssetType
    asset = Asset(
        user_id=CUSSEI_ID,
        family_id=FAMILY_ID,
        name="Electrodomésticos",
        type=AssetType.ELECTRONICS,
        purchase_price=180000000,  # 1.8M Kz
        current_value=120000000,   # 1.2M Kz (depreciação)
        purchase_date=date(2024, 6, 15),
        is_active=True,
    )
    db.add(asset)
    await db.flush()
    print("  Created family asset 'Electrodomésticos' (1.2M Kz)")


async def main():
    print("=" * 50)
    print("Seed Video Data — O Financeiro")
    print("=" * 50)

    async with SessionLocal() as db:
        print("\n1. Ana — transacções pessoais")
        await seed_ana_transactions(db)

        print("\n2. Ana — meta pessoal")
        await seed_ana_goal(db)

        print("\n3. Cussei — meta extra")
        await seed_cussei_extra_goal(db)

        print("\n4. Família — transacções extra")
        await seed_family_extra_transactions(db)

        print("\n5. Família — meta extra")
        await seed_family_extra_goal(db)

        print("\n6. Família — bem extra")
        await seed_family_extra_asset(db)

        await db.commit()
        print("\n" + "=" * 50)
        print("Seed video data complete!")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
