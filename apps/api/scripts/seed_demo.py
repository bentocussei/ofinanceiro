"""Seed demo data: user + personal data + family with spouse.

Creates a realistic demo account for Angola with:
- 1 user (Cussei) + 1 spouse (Ana)
- 3 personal accounts + transactions across 60 days
- 1 family (Família Cussei) with shared accounts
- Budgets, goals, debts, bills, income sources, investments
- Notifications

Run: cd apps/api && .venv/bin/python3 -m scripts.seed_demo
"""

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import (
    Account,
    Asset,
    Bill,
    Budget,
    BudgetItem,
    Category,
    Debt,
    DebtPayment,
    Family,
    FamilyMember,
    Goal,
    GoalContribution,
    IncomeSource,
    Investment,
    Notification,
    Plan,
    Promotion,
    Transaction,
    User,
    UserSubscription,
)
from app.models.enums import (
    AccountType,
    AssetType,
    BillingCycle,
    BillStatus,
    BudgetMethod,
    BudgetPeriod,
    CurrencyCode,
    DebtNature,
    DebtType,
    FamilyRelation,
    FamilyRole,
    GoalStatus,
    IncomeSourceType,
    NotificationType,
    PlanType,
    PromotionType,
    RecurrenceFrequency,
    SubscriptionStatus,
    TransactionType,
)
from app.services.auth import hash_password
from scripts.seed import seed_categories

TODAY = date.today()
NOW = datetime.now(UTC)


def kz(value: float) -> int:
    """Convert Kz amount to centavos."""
    return int(value * 100)


async def main() -> None:
    async with async_session() as db:
        # Check if demo user already exists
        existing = await db.execute(select(User).where(User.phone == "+244923456789"))
        if existing.scalar_one_or_none():
            print("Demo data already exists. Drop and recreate the DB first.")
            return

        # --- Seed categories first ---
        await seed_categories(db)

        # Get some categories for transactions
        cats = {}
        result = await db.execute(select(Category).where(Category.is_system.is_(True)))
        for cat in result.scalars().all():
            cats[cat.name.lower()] = cat.id

        def cat(name: str) -> uuid.UUID | None:
            for key, cid in cats.items():
                if name.lower() in key:
                    return cid
            return None

        # ==========================================
        # USERS
        # ==========================================
        cussei_id = uuid.uuid4()
        ana_id = uuid.uuid4()

        cussei = User(
            id=cussei_id,
            phone="+244923456789",
            email="cussei@ofinanceiro.ao",
            password_hash=hash_password("demo1234"),
            name="Cussei Bento",
            currency_default=CurrencyCode.AOA,
            country="AO",
            language="pt-AO",
            salary_day=25,
            month_start_day=1,
            onboarding_completed=True,
            preferences={"xp": 150, "streak_days": 7, "completed_challenges": ["1"]},
        )

        ana = User(
            id=ana_id,
            phone="+244912345678",
            email="ana@ofinanceiro.ao",
            password_hash=hash_password("demo1234"),
            name="Ana Cussei",
            currency_default=CurrencyCode.AOA,
            country="AO",
            language="pt-AO",
            salary_day=28,
            month_start_day=1,
            onboarding_completed=True,
        )
        db.add_all([cussei, ana])
        await db.flush()

        # ==========================================
        # PERSONAL ACCOUNTS (Cussei)
        # ==========================================
        acc_bai_id = uuid.uuid4()
        acc_cash_id = uuid.uuid4()
        acc_bfa_id = uuid.uuid4()

        accounts_cussei = [
            Account(
                id=acc_bai_id, user_id=cussei_id, name="BAI Conta Ordem",
                type=AccountType.BANK, balance=kz(485_000), institution="BAI",
                icon="🏦", currency=CurrencyCode.AOA,
            ),
            Account(
                id=acc_cash_id, user_id=cussei_id, name="Carteira",
                type=AccountType.CASH, balance=kz(32_500),
                icon="💵", currency=CurrencyCode.AOA,
            ),
            Account(
                id=acc_bfa_id, user_id=cussei_id, name="BFA Poupança",
                type=AccountType.SAVINGS, balance=kz(750_000), institution="BFA",
                icon="🏦", currency=CurrencyCode.AOA,
            ),
        ]
        db.add_all(accounts_cussei)

        # PERSONAL ACCOUNTS (Ana)
        acc_ana_bai_id = uuid.uuid4()
        acc_ana_cash_id = uuid.uuid4()

        accounts_ana = [
            Account(
                id=acc_ana_bai_id, user_id=ana_id, name="BAI Conta Salário",
                type=AccountType.BANK, balance=kz(320_000), institution="BAI",
                currency=CurrencyCode.AOA,
            ),
            Account(
                id=acc_ana_cash_id, user_id=ana_id, name="Carteira",
                type=AccountType.CASH, balance=kz(15_000),
                currency=CurrencyCode.AOA,
            ),
        ]
        db.add_all(accounts_ana)
        await db.flush()

        # ==========================================
        # FAMILY
        # ==========================================
        family_id = uuid.uuid4()
        family = Family(
            id=family_id, name="Família Cussei",
            admin_user_id=cussei_id, currency=CurrencyCode.AOA,
            month_start_day=1, invite_code="CUSSEI-DEMO-2026",
        )
        db.add(family)
        await db.flush()

        # Shared family account
        acc_family_id = uuid.uuid4()
        acc_family = Account(
            id=acc_family_id, user_id=cussei_id, family_id=family_id,
            name="Conta Família", type=AccountType.BANK,
            balance=kz(180_000), institution="BAI", is_shared=True,
            currency=CurrencyCode.AOA,
        )
        db.add(acc_family)

        member_cussei = FamilyMember(
            family_id=family_id, user_id=cussei_id, role=FamilyRole.ADMIN,
            display_name="Cussei", family_relation=FamilyRelation.SPOUSE,
            can_add_transactions=True, can_edit_budgets=True,
            can_view_all_accounts=True, can_invite_members=True,
        )
        member_ana = FamilyMember(
            family_id=family_id, user_id=ana_id, role=FamilyRole.ADULT,
            display_name="Ana", family_relation=FamilyRelation.SPOUSE,
            can_add_transactions=True, can_edit_budgets=False,
            can_view_all_accounts=True, can_invite_members=False,
        )
        db.add_all([member_cussei, member_ana])
        await db.flush()

        # ==========================================
        # PERSONAL TRANSACTIONS (Cussei) — 60 days
        # ==========================================
        personal_txns = []
        # Salário dos últimos 2 meses
        for month_offset in [1, 0]:
            sal_date = TODAY.replace(day=25) - timedelta(days=30 * month_offset)
            if sal_date > TODAY:
                sal_date = sal_date.replace(month=sal_date.month - 1)
            personal_txns.append(Transaction(
                user_id=cussei_id, account_id=acc_bai_id, category_id=cat("salário"),
                amount=kz(650_000), type=TransactionType.INCOME,
                description="Salário", transaction_date=sal_date,
            ))

        # Despesas variadas ao longo de 60 dias
        expenses = [
            (-58, "Renda apartamento", kz(120_000), acc_bai_id, "renda"),
            (-55, "ENDE electricidade", kz(18_500), acc_bai_id, "electricidade"),
            (-52, "EPAL água", kz(8_200), acc_bai_id, "água"),
            (-50, "Compras Kero", kz(45_000), acc_bai_id, "supermercado"),
            (-48, "Candongueiro", kz(1_500), acc_cash_id, "transporte"),
            (-45, "Almoço restaurante", kz(5_500), acc_cash_id, "restaurante"),
            (-42, "Farmácia", kz(12_000), acc_cash_id, "saúde"),
            (-40, "Internet Unitel", kz(15_000), acc_bai_id, "internet"),
            (-38, "Gasolina", kz(22_000), acc_bai_id, "transporte"),
            (-35, "Zungueira fruta", kz(3_500), acc_cash_id, "alimentação"),
            (-33, "Propina escolar", kz(35_000), acc_bai_id, "educação"),
            (-30, "Renda apartamento", kz(120_000), acc_bai_id, "renda"),
            (-28, "ENDE electricidade", kz(19_200), acc_bai_id, "electricidade"),
            (-25, "Compras Shoprite", kz(38_000), acc_bai_id, "supermercado"),
            (-22, "Candongueiro", kz(2_000), acc_cash_id, "transporte"),
            (-20, "Mecânico", kz(45_000), acc_bai_id, "manutenção"),
            (-18, "Roupa Pepe Jeans", kz(28_000), acc_bai_id, "vestuário"),
            (-15, "Aniversário amigo", kz(15_000), acc_cash_id, "presentes"),
            (-12, "Gasolina", kz(20_000), acc_bai_id, "transporte"),
            (-10, "Compras Kero", kz(52_000), acc_bai_id, "supermercado"),
            (-8, "Cinema", kz(8_000), acc_cash_id, "lazer"),
            (-6, "EPAL água", kz(7_800), acc_bai_id, "água"),
            (-5, "Internet Unitel", kz(15_000), acc_bai_id, "internet"),
            (-3, "Almoço restaurante", kz(6_200), acc_cash_id, "restaurante"),
            (-2, "Zungueira legumes", kz(4_500), acc_cash_id, "alimentação"),
            (-1, "Uber", kz(3_800), acc_bai_id, "transporte"),
        ]

        for days, desc, amount, acc, cat_name in expenses:
            personal_txns.append(Transaction(
                user_id=cussei_id, account_id=acc,
                category_id=cat(cat_name),
                amount=amount, type=TransactionType.EXPENSE,
                description=desc, transaction_date=TODAY + timedelta(days=days),
            ))

        db.add_all(personal_txns)

        # ==========================================
        # FAMILY TRANSACTIONS — shared account
        # ==========================================
        family_txns = [
            Transaction(
                user_id=cussei_id, account_id=acc_family_id,
                category_id=cat("supermercado"), amount=kz(65_000),
                type=TransactionType.EXPENSE, description="Compras família Kero",
                transaction_date=TODAY - timedelta(days=15),
            ),
            Transaction(
                user_id=ana_id, account_id=acc_family_id,
                category_id=cat("saúde"), amount=kz(25_000),
                type=TransactionType.EXPENSE, description="Consulta pediatra",
                transaction_date=TODAY - timedelta(days=10),
            ),
            Transaction(
                user_id=cussei_id, account_id=acc_family_id,
                category_id=cat("educação"), amount=kz(40_000),
                type=TransactionType.EXPENSE, description="Material escolar",
                transaction_date=TODAY - timedelta(days=7),
            ),
            Transaction(
                user_id=ana_id, account_id=acc_family_id,
                category_id=cat("alimentação"), amount=kz(18_000),
                type=TransactionType.EXPENSE, description="Zungueira semanal",
                transaction_date=TODAY - timedelta(days=3),
            ),
            # Contribuição para conta família
            Transaction(
                user_id=cussei_id, account_id=acc_family_id,
                amount=kz(100_000), type=TransactionType.INCOME,
                description="Contribuição mensal Cussei",
                transaction_date=TODAY - timedelta(days=25),
            ),
            Transaction(
                user_id=ana_id, account_id=acc_family_id,
                amount=kz(80_000), type=TransactionType.INCOME,
                description="Contribuição mensal Ana",
                transaction_date=TODAY - timedelta(days=24),
            ),
        ]
        db.add_all(family_txns)

        # ==========================================
        # BUDGETS (Personal — Cussei)
        # ==========================================
        budget_id = uuid.uuid4()
        budget = Budget(
            id=budget_id, user_id=cussei_id, name="Orçamento Março",
            method=BudgetMethod.CATEGORY, period_type=BudgetPeriod.MONTHLY,
            period_start=TODAY.replace(day=1),
            period_end=(TODAY.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1),
            total_limit=kz(400_000), alert_threshold=80, alert_enabled=True,
        )
        db.add(budget)
        await db.flush()

        # Budget items
        budget_items_data = [
            ("alimentação", kz(80_000)),
            ("transporte", kz(50_000)),
            ("saúde", kz(30_000)),
            ("lazer", kz(25_000)),
            ("educação", kz(40_000)),
        ]
        for cat_name, limit in budget_items_data:
            cid = cat(cat_name)
            if cid:
                db.add(BudgetItem(budget_id=budget_id, category_id=cid, limit_amount=limit))

        # ==========================================
        # GOALS (Personal + Family)
        # ==========================================
        goal_car_id = uuid.uuid4()
        goal_emergency_id = uuid.uuid4()
        goal_family_id = uuid.uuid4()

        goals = [
            Goal(
                id=goal_car_id, user_id=cussei_id, name="Carro novo",
                type="savings", target_amount=kz(8_000_000), current_amount=kz(2_400_000),
                contribution_amount=kz(200_000), contribution_frequency=RecurrenceFrequency.MONTHLY,
                status=GoalStatus.ACTIVE, savings_account_id=acc_bfa_id,
                description="Toyota Hilux 2024",
            ),
            Goal(
                id=goal_emergency_id, user_id=cussei_id, name="Fundo de emergência",
                type="savings", target_amount=kz(2_000_000), current_amount=kz(750_000),
                contribution_amount=kz(100_000), contribution_frequency=RecurrenceFrequency.MONTHLY,
                status=GoalStatus.ACTIVE, savings_account_id=acc_bfa_id,
            ),
            Goal(
                id=goal_family_id, user_id=cussei_id, family_id=family_id,
                name="Férias família", type="savings",
                target_amount=kz(1_500_000), current_amount=kz(450_000),
                contribution_amount=kz(75_000), contribution_frequency=RecurrenceFrequency.MONTHLY,
                status=GoalStatus.ACTIVE,
                description="Férias no Namibe em Dezembro",
            ),
        ]
        db.add_all(goals)
        await db.flush()

        # Goal contributions
        for i in range(3):
            db.add(GoalContribution(
                goal_id=goal_car_id, user_id=cussei_id, amount=kz(200_000),
                note=f"Contribuição mês {i + 1}",
                contributed_at=NOW - timedelta(days=30 * (2 - i)),
            ))
        db.add(GoalContribution(
            goal_id=goal_family_id, user_id=cussei_id, amount=kz(250_000),
            note="Contribuição Cussei",
            contributed_at=NOW - timedelta(days=20),
        ))
        db.add(GoalContribution(
            goal_id=goal_family_id, user_id=ana_id, amount=kz(200_000),
            note="Contribuição Ana",
            contributed_at=NOW - timedelta(days=18),
        ))

        # ==========================================
        # DEBTS (Personal — Cussei)
        # ==========================================
        debt_car_id = uuid.uuid4()
        debt_friend_id = uuid.uuid4()

        debt_family_id = uuid.uuid4()

        debts = [
            Debt(
                id=debt_car_id, user_id=cussei_id, name="Empréstimo automóvel",
                type=DebtType.CAR_LOAN, creditor="BAI", nature=DebtNature.FORMAL,
                original_amount=kz(5_000_000), current_balance=kz(3_200_000),
                interest_rate=1500, monthly_payment=kz(150_000), payment_day=5,
                start_date=TODAY - timedelta(days=365),
            ),
            Debt(
                id=debt_friend_id, user_id=cussei_id, name="Empréstimo do João",
                type=DebtType.INFORMAL, creditor="João Silva", nature=DebtNature.INFORMAL,
                original_amount=kz(200_000), current_balance=kz(80_000),
                monthly_payment=kz(40_000), payment_day=15,
            ),
            # Family debt
            Debt(
                id=debt_family_id, user_id=cussei_id, family_id=family_id,
                name="Electrodomésticos casa", type=DebtType.INFORMAL,
                creditor="Loja Mega", nature=DebtNature.FORMAL,
                original_amount=kz(800_000), current_balance=kz(400_000),
                monthly_payment=kz(100_000), payment_day=10,
            ),
        ]
        db.add_all(debts)
        await db.flush()

        # Debt payments
        for i in range(3):
            db.add(DebtPayment(
                debt_id=debt_car_id, amount=kz(150_000),
                principal=kz(110_000), interest=kz(40_000),
                payment_date=TODAY - timedelta(days=30 * (2 - i)),
            ))
        db.add(DebtPayment(
            debt_id=debt_friend_id, amount=kz(40_000),
            payment_date=TODAY - timedelta(days=15),
        ))

        # ==========================================
        # BILLS
        # ==========================================
        bills = [
            Bill(
                user_id=cussei_id, name="Renda", amount=kz(120_000),
                due_day=1, frequency=RecurrenceFrequency.MONTHLY,
                status=BillStatus.PAID, is_active=True,
                next_due_date=TODAY.replace(day=1) + timedelta(days=32),
            ),
            Bill(
                user_id=cussei_id, name="ENDE Electricidade", amount=kz(18_000),
                due_day=10, frequency=RecurrenceFrequency.MONTHLY,
                status=BillStatus.PENDING, is_active=True,
                next_due_date=TODAY.replace(day=10) if TODAY.day < 10 else (TODAY.replace(day=1) + timedelta(days=32)).replace(day=10),
            ),
            Bill(
                user_id=cussei_id, name="EPAL Água", amount=kz(8_000),
                due_day=15, frequency=RecurrenceFrequency.MONTHLY,
                status=BillStatus.PENDING, is_active=True,
                next_due_date=TODAY.replace(day=15) if TODAY.day < 15 else (TODAY.replace(day=1) + timedelta(days=32)).replace(day=15),
            ),
            Bill(
                user_id=cussei_id, name="Internet Unitel", amount=kz(15_000),
                due_day=20, frequency=RecurrenceFrequency.MONTHLY,
                status=BillStatus.PENDING, is_active=True,
                next_due_date=TODAY.replace(day=20) if TODAY.day < 20 else (TODAY.replace(day=1) + timedelta(days=32)).replace(day=20),
            ),
            # Family bill
            Bill(
                user_id=cussei_id, family_id=family_id, name="Seguro saúde familiar",
                amount=kz(45_000), due_day=5, frequency=RecurrenceFrequency.MONTHLY,
                status=BillStatus.PENDING, is_active=True,
            ),
        ]
        db.add_all(bills)

        # ==========================================
        # INCOME SOURCES
        # ==========================================
        income_sources = [
            IncomeSource(
                user_id=cussei_id, name="Salário Magiflex",
                type=IncomeSourceType.SALARY, expected_amount=kz(650_000),
                frequency=RecurrenceFrequency.MONTHLY, day_of_month=25,
                account_id=acc_bai_id,
            ),
            IncomeSource(
                user_id=cussei_id, name="Freelance",
                type=IncomeSourceType.FREELANCE, expected_amount=kz(150_000),
                frequency=RecurrenceFrequency.MONTHLY,
            ),
            IncomeSource(
                user_id=ana_id, name="Salário Ana",
                type=IncomeSourceType.SALARY, expected_amount=kz(450_000),
                frequency=RecurrenceFrequency.MONTHLY, day_of_month=28,
                account_id=acc_ana_bai_id,
            ),
        ]
        db.add_all(income_sources)

        # ==========================================
        # INVESTMENTS
        # ==========================================
        investments = [
            Investment(
                user_id=cussei_id, name="Depósito a prazo BAI",
                type="deposit", institution="BAI", invested_amount=kz(500_000),
                current_value=kz(525_000), interest_rate=700,
                start_date=TODAY - timedelta(days=180),
            ),
            Investment(
                user_id=cussei_id, name="Obrigações do Tesouro",
                type="bond", institution="BNA", invested_amount=kz(1_000_000),
                current_value=kz(1_080_000), interest_rate=1200,
                start_date=TODAY - timedelta(days=365),
            ),
            # Family investment
            Investment(
                user_id=cussei_id, family_id=family_id,
                name="Poupança familiar BAI",
                type="savings", institution="BAI", invested_amount=kz(300_000),
                current_value=kz(315_000), interest_rate=500,
                start_date=TODAY - timedelta(days=120),
            ),
        ]
        db.add_all(investments)

        # ==========================================
        # PHYSICAL ASSETS
        # ==========================================
        assets = [
            Asset(
                user_id=cussei_id, name="Apartamento T3 Talatona",
                type=AssetType.REAL_ESTATE,
                purchase_price=kz(25_000_000), current_value=kz(28_000_000),
                purchase_date=TODAY - timedelta(days=730),
                last_valuation_date=TODAY - timedelta(days=60),
                annual_change_rate=600,  # 6% appreciation
                details={"address": "Talatona, Luanda", "area_sqm": 120, "bedrooms": 3, "parking": 1},
                linked_debt_id=debt_car_id,  # linked to mortgage (reusing car loan for demo)
                is_insured=True, insurance_value=kz(25_000_000),
                insurance_expiry=TODAY + timedelta(days=180),
                description="Apartamento na urbanização Nova Vida",
            ),
            Asset(
                user_id=cussei_id, name="Toyota Hilux 2024",
                type=AssetType.VEHICLE,
                purchase_price=kz(12_000_000), current_value=kz(10_200_000),
                purchase_date=TODAY - timedelta(days=365),
                last_valuation_date=TODAY - timedelta(days=30),
                annual_change_rate=-1500,  # -15% depreciation
                details={"brand": "Toyota", "model": "Hilux SR5", "year": 2024, "plate": "LD-45-67-AB", "km": 25000},
                is_insured=True, insurance_value=kz(12_000_000),
                insurance_expiry=TODAY + timedelta(days=90),
            ),
            Asset(
                user_id=cussei_id, name="Terreno Benfica",
                type=AssetType.LAND,
                purchase_price=kz(5_000_000), current_value=kz(6_500_000),
                purchase_date=TODAY - timedelta(days=1095),
                annual_change_rate=800,  # 8% appreciation
                details={"address": "Benfica, Luanda"},
                description="Terreno 500m² para construção futura",
            ),
            # Family asset
            Asset(
                user_id=cussei_id, family_id=family_id,
                name="Mobiliário casa",
                type=AssetType.FURNITURE,
                purchase_price=kz(3_500_000), current_value=kz(2_800_000),
                purchase_date=TODAY - timedelta(days=365),
                annual_change_rate=-2000,  # -20% depreciation
                description="Sala, quartos e cozinha completos",
            ),
        ]
        db.add_all(assets)

        # ==========================================
        # NOTIFICATIONS
        # ==========================================
        notifications = [
            Notification(
                user_id=cussei_id, type=NotificationType.BILL_REMINDER,
                title="ENDE Electricidade vence em 3 dias",
                body="A conta ENDE Electricidade de 18.000 Kz vence no dia 10.",
                is_read=False,
            ),
            Notification(
                user_id=cussei_id, type=NotificationType.BUDGET_ALERT,
                title="Orçamento alimentação a 85%",
                body="Já gastou 68.000 Kz dos 80.000 Kz planeados para alimentação.",
                is_read=False,
            ),
            Notification(
                user_id=cussei_id, type=NotificationType.GOAL_MILESTONE,
                title="Meta 'Carro novo' a 30%",
                body="Já poupou 2.400.000 Kz dos 8.000.000 Kz. Continue assim!",
                is_read=True,
            ),
            Notification(
                user_id=cussei_id, type=NotificationType.SMART_INSIGHT,
                title="Gastou 15% mais em transporte este mês",
                body="Comparando com o mês passado, as suas despesas de transporte aumentaram 15%.",
                is_read=False,
            ),
        ]
        db.add_all(notifications)

        # ==========================================
        # PLANS
        # ==========================================
        personal_features = {
            "accounts": {"limit": -1},
            "transactions": {"limit": -1},
            "ai": {"messages_limit": -1, "model": "sonnet", "opus_analyses": -1},
            "ocr": {"receipts_limit": -1},
            "voice": {"commands_limit": -1},
            "budgets": {"enabled": True},
            "goals": {"enabled": True},
            "investments": {"enabled": True},
            "assets": {"enabled": True},
            "debts": {"enabled": True},
            "reports": {"advanced": True},
            "education": {"enabled": True},
            "news": {"enabled": True},
            "family": {"enabled": False},
        }
        family_features = {**personal_features, "family": {"enabled": True}}

        plan_personal_id = uuid.uuid4()
        plan_family_id = uuid.uuid4()

        plan_personal = Plan(
            id=plan_personal_id, type=PlanType.PERSONAL,
            name="Pessoal", description="Controlo total das suas finanças pessoais",
            base_price_monthly=149000, base_price_annual=1490000,
            max_family_members=0, extra_member_cost=0,
            features=personal_features,
        )
        plan_family = Plan(
            id=plan_family_id, type=PlanType.FAMILY,
            name="Familiar", description="Gestão financeira para toda a família",
            base_price_monthly=349000, base_price_annual=3490000,
            max_family_members=5, extra_member_cost=49000,
            features=family_features,
        )
        db.add_all([plan_personal, plan_family])

        # ==========================================
        # PROMOTIONS
        # ==========================================
        promo_launch = Promotion(
            name="Lançamento O Financeiro",
            code=None,
            type=PromotionType.FREE_DAYS,
            value=90,
            start_date=NOW,
            end_date=None,
            apply_to_all=True,
            applicable_plan_types=["personal", "family"],
            max_beneficiaries=None,
            auto_apply_on_register=True,
            free_days=90,
        )
        promo_first100 = Promotion(
            name="Primeiros 100 utilizadores",
            code="PRIMEIRO100",
            type=PromotionType.PERCENTAGE,
            value=50,
            start_date=NOW,
            end_date=NOW + timedelta(days=180),
            apply_to_all=True,
            applicable_plan_types=["personal", "family"],
            max_beneficiaries=100,
            auto_apply_on_register=False,
            free_days=0,
        )
        db.add_all([promo_launch, promo_first100])
        await db.flush()

        # ==========================================
        # USER SUBSCRIPTIONS (Cussei + Ana)
        # ==========================================
        # Cussei: Familiar plan (he has a family)
        cussei_sub = UserSubscription(
            user_id=cussei_id, plan_id=plan_family_id,
            plan_snapshot={
                "type": "family", "name": "Familiar",
                "base_price_monthly": 349000, "base_price_annual": 3490000,
                "max_family_members": 5, "extra_member_cost": 49000,
                "features": family_features,
            },
            billing_cycle=BillingCycle.MONTHLY,
            status=SubscriptionStatus.ACTIVE,
            base_price=349000, discount_amount=349000,
            extra_members_count=0, extra_members_cost=0,
            feature_addons_cost=0, final_price=0,
            promotion_id=promo_launch.id,
            start_date=NOW, end_date=NOW + timedelta(days=90),
            trial_end_date=NOW + timedelta(days=90),
        )

        # Ana: Personal plan (inherited from family, but has own sub)
        ana_sub = UserSubscription(
            user_id=ana_id, plan_id=plan_personal_id,
            plan_snapshot={
                "type": "personal", "name": "Pessoal",
                "base_price_monthly": 149000, "base_price_annual": 1490000,
                "max_family_members": 0, "extra_member_cost": 0,
                "features": personal_features,
            },
            billing_cycle=BillingCycle.MONTHLY,
            status=SubscriptionStatus.ACTIVE,
            base_price=149000, discount_amount=149000,
            extra_members_count=0, extra_members_cost=0,
            feature_addons_cost=0, final_price=0,
            promotion_id=promo_launch.id,
            start_date=NOW, end_date=NOW + timedelta(days=90),
            trial_end_date=NOW + timedelta(days=90),
        )
        db.add_all([cussei_sub, ana_sub])
        await db.flush()

        # ==========================================
        # PERMISSIONS
        # ==========================================
        from app.permissions import get_plan_permissions
        from app.services.permission import seed_permissions, seed_plan_permissions, sync_user_permissions_from_plan

        perm_count = await seed_permissions(db)
        # Assign permissions to plans
        personal_perms = get_plan_permissions("personal")
        family_perms = get_plan_permissions("family")
        await seed_plan_permissions(db, plan_personal_id, personal_perms)
        await seed_plan_permissions(db, plan_family_id, family_perms)
        # Sync permissions for demo users
        await sync_user_permissions_from_plan(db, cussei_id, cussei_sub.plan_snapshot)
        await sync_user_permissions_from_plan(db, ana_id, ana_sub.plan_snapshot)

        await db.commit()
        print("=" * 50)
        print("Demo data seeded successfully!")
        print("=" * 50)
        print(f"User: Cussei Bento (+244923456789 / demo1234)")
        print(f"User: Ana Cussei (+244912345678 / demo1234)")
        print(f"Family: Família Cussei (code: CUSSEI-DEMO-2026)")
        print(f"Personal accounts: 3 (BAI, Carteira, BFA)")
        print(f"Family account: 1 (Conta Família)")
        print(f"Transactions: {len(personal_txns)} personal + {len(family_txns)} family")
        print(f"Budget: 1 with 5 items")
        print(f"Goals: 2 personal + 1 family")
        print(f"Debts: 2 personal + 1 family with payments")
        print(f"Bills: 4 personal + 1 family")
        print(f"Income sources: 3")
        print(f"Investments: 2 personal + 1 family")
        print(f"Assets: 3 personal + 1 family")
        print(f"Notifications: 4")
        print(f"Plans: 2 (Pessoal + Familiar)")
        print(f"Promotions: 2 (Lançamento 90 dias + Primeiro100 50%)")
        print(f"Subscriptions: 2 (Cussei Familiar + Ana Pessoal, trial 90 dias)")
        print(f"Permissions: {perm_count} seeded + plan mappings + user sync")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
