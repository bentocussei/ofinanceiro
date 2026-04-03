"""Production seed — minimum data required for the platform to function.

Creates:
- System categories (84 Angola-specific categories)
- Permissions (115 — all client + admin permissions)
- Plans (Pessoal + Familiar) with plan permissions
- Launch promotion (90 days free)
- Admin user with super admin role
- Admin roles (super_admin, support, billing_admin)

Run: cd apps/api && .venv/bin/python3 -m scripts.seed_production

IMPORTANT: This script is idempotent — safe to run multiple times.
It checks for existing data before inserting.
"""

import asyncio
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import (
    AdminRole,
    AdminRolePermission,
    AdminUser,
    CompanySettings,
    Permission,
    Plan,
    PlanPermission,
    Promotion,
    User,
    UserSubscription,
)
from app.models.enums import (
    BillingCycle,
    PlanType,
    PromotionType,
    SubscriptionStatus,
)
from app.permissions import (
    generate_admin_permissions,
    get_plan_permissions,
)
from app.services.auth import hash_password
from app.services.permission import seed_permissions, seed_plan_permissions
from scripts.seed import seed_categories

# ============================================================
# Configuration — change these for your deployment
# ============================================================
ADMIN_NAME = "Admin O Financeiro"
ADMIN_PHONE = "+244900000000"
ADMIN_EMAIL = "admin@ofinanceiro.ao"
ADMIN_PASSWORD = secrets.token_urlsafe(16)  # Random, printed to console once

PERSONAL_PLAN_MONTHLY = 199000   # 1.990 Kz in centavos
PERSONAL_PLAN_ANNUAL = 1990000   # 19.900 Kz (2 meses grátis)
FAMILY_PLAN_MONTHLY = 499000     # 4.990 Kz
FAMILY_PLAN_ANNUAL = 4990000     # 49.900 Kz (2 meses grátis)
FAMILY_MAX_MEMBERS = 5
FAMILY_EXTRA_MEMBER_COST = 99000  # 990 Kz

TRIAL_FREE_DAYS = 30  # Default trial: 30 days free for all new users
LAUNCH_PROMO_FREE_DAYS = 90  # Launch promotion: 90 days (can be activated via admin)

# Test user for payment testing (no promotion)
TEST_USER_PHONE = "+244900000001"
TEST_USER_NAME = "Utilizador Teste"
TEST_USER_PASSWORD = "teste12345"


async def seed_plans(db: AsyncSession) -> tuple[uuid.UUID, uuid.UUID]:
    """Create Pessoal and Familiar plans if they don't exist."""
    existing = await db.execute(select(Plan).where(Plan.is_active.is_(True)).limit(1))
    if existing.scalar_one_or_none():
        print("Plans already exist, skipping.")
        plans = await db.execute(select(Plan).where(Plan.is_active.is_(True)))
        plan_list = plans.scalars().all()
        personal_id = next((p.id for p in plan_list if p.type == PlanType.PERSONAL), None)
        family_id = next((p.id for p in plan_list if p.type == PlanType.FAMILY), None)
        return personal_id, family_id

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

    personal_id = uuid.uuid4()
    family_id = uuid.uuid4()

    db.add(Plan(
        id=personal_id, type=PlanType.PERSONAL,
        name="Pessoal", description="Controlo total das suas finanças pessoais",
        base_price_monthly=PERSONAL_PLAN_MONTHLY,
        base_price_annual=PERSONAL_PLAN_ANNUAL,
        max_family_members=0, extra_member_cost=0,
        features=personal_features,
        gateway_metadata={
            "stripe": {
                "product_id": "prod_UGOxwUXL4aqyB9",
                "price_monthly_id": "price_1THs9qKqiSjhepmT6Y7zLcbI",
                "price_annual_id": "price_1THsADKqiSjhepmTJwwJzlHP",
            }
        },
    ))
    db.add(Plan(
        id=family_id, type=PlanType.FAMILY,
        name="Familiar", description="Gestão financeira para toda a família",
        base_price_monthly=FAMILY_PLAN_MONTHLY,
        base_price_annual=FAMILY_PLAN_ANNUAL,
        max_family_members=FAMILY_MAX_MEMBERS,
        extra_member_cost=FAMILY_EXTRA_MEMBER_COST,
        features=family_features,
        gateway_metadata={
            "stripe": {
                "product_id": "prod_UGOxXRxjgoEn3M",
                "price_monthly_id": "price_1THsAdKqiSjhepmTSRONuBnT",
                "price_annual_id": "price_1THsAuKqiSjhepmTJoVfkDxp",
            }
        },
    ))
    await db.flush()
    print(f"Plans created: Pessoal ({PERSONAL_PLAN_MONTHLY // 100} Kz) + Familiar ({FAMILY_PLAN_MONTHLY // 100} Kz)")
    return personal_id, family_id


async def seed_company_settings(db: AsyncSession) -> None:
    """Create default company settings if not exists."""
    existing = await db.execute(select(CompanySettings).limit(1))
    if existing.scalar_one_or_none():
        print("Company settings already exist, skipping.")
        return

    db.add(CompanySettings(
        name="O Financeiro, Lda",
        nif="0000000000",
        address="Luanda, Angola",
        city="Luanda",
        country="AO",
        email="suporte@ofinanceiro.app",
        vat_rate=0,
        vat_exempt_reason="M01",
        agt_certificate_number="0",
    ))
    await db.flush()
    print("Company settings created (update NIF and address via admin)")


async def seed_trial_promotion(db: AsyncSession) -> None:
    """Create default trial promotion (30 days free for all new users)."""
    existing = await db.execute(
        select(Promotion).where(Promotion.auto_apply_on_register.is_(True), Promotion.is_active.is_(True)).limit(1)
    )
    if existing.scalar_one_or_none():
        print("Trial promotion already exists, skipping.")
        return

    from datetime import UTC, datetime

    db.add(Promotion(
        name="Trial Gratuito",
        code=None,
        type=PromotionType.FREE_DAYS,
        value=TRIAL_FREE_DAYS,
        start_date=datetime.now(UTC),
        end_date=None,
        apply_to_all=True,
        applicable_plan_types=["personal", "family"],
        max_beneficiaries=None,
        auto_apply_on_register=True,
        free_days=TRIAL_FREE_DAYS,
        priority=10,
    ))
    await db.flush()
    print(f"Trial promotion created: {TRIAL_FREE_DAYS} days free for all new users")


async def seed_admin_roles(db: AsyncSession) -> dict[str, uuid.UUID]:
    """Create admin roles if they don't exist."""
    existing = await db.execute(select(AdminRole).limit(1))
    if existing.scalar_one_or_none():
        print("Admin roles already exist, skipping.")
        roles = await db.execute(select(AdminRole))
        return {r.name: r.id for r in roles.scalars().all()}

    admin_perms = generate_admin_permissions()
    roles = {}

    # Super Admin — all permissions
    super_id = uuid.uuid4()
    db.add(AdminRole(id=super_id, name="super_admin", description="Acesso total à plataforma"))
    roles["super_admin"] = super_id

    # Support — read-only on users and subscriptions
    support_id = uuid.uuid4()
    db.add(AdminRole(id=support_id, name="support", description="Suporte ao cliente — consultar utilizadores e subscrições"))
    roles["support"] = support_id

    # Billing Admin — manage plans, promotions, subscriptions
    billing_id = uuid.uuid4()
    db.add(AdminRole(id=billing_id, name="billing_admin", description="Gestão de planos, promoções e subscrições"))
    roles["billing_admin"] = billing_id

    await db.flush()

    # Assign permissions to roles
    # Get all permission records
    perm_result = await db.execute(select(Permission).where(Permission.is_client.is_(False)))
    perm_map = {p.code: p.id for p in perm_result.scalars().all()}

    # Super admin gets ALL admin permissions
    for code, perm_id in perm_map.items():
        db.add(AdminRolePermission(role_id=super_id, permission_id=perm_id))

    # Support gets read-only
    support_perms = [c for c in perm_map if ":read" in c]
    for code in support_perms:
        db.add(AdminRolePermission(role_id=support_id, permission_id=perm_map[code]))

    # Billing admin gets billing module
    billing_perms = [c for c in perm_map if c.startswith("admin_billing:")]
    for code in billing_perms:
        db.add(AdminRolePermission(role_id=billing_id, permission_id=perm_map[code]))

    await db.flush()
    print(f"Admin roles created: super_admin ({len(perm_map)} perms), support ({len(support_perms)} perms), billing_admin ({len(billing_perms)} perms)")
    return roles


async def seed_admin_user(db: AsyncSession, roles: dict[str, uuid.UUID]) -> None:
    """Create the platform admin user if doesn't exist."""
    existing = await db.execute(select(User).where(User.phone == ADMIN_PHONE))
    if existing.scalar_one_or_none():
        print(f"Admin user already exists ({ADMIN_PHONE}), skipping.")
        return

    admin = User(
        phone=ADMIN_PHONE,
        email=ADMIN_EMAIL,
        name=ADMIN_NAME,
        password_hash=hash_password(ADMIN_PASSWORD),
        country="AO",
        language="pt-AO",
        onboarding_completed=True,
        preferences={"is_admin": True},
    )
    db.add(admin)
    await db.flush()

    # Assign super_admin role
    super_role_id = roles.get("super_admin")
    if super_role_id:
        db.add(AdminUser(user_id=admin.id, role_id=super_role_id))
        await db.flush()

    print(f"Admin user created: {ADMIN_NAME} ({ADMIN_PHONE} / {ADMIN_EMAIL})")
    print(f"  Password: {ADMIN_PASSWORD}")
    print(f"  Role: super_admin")
    print(f"  ⚠ CHANGE THE PASSWORD after first login!")


async def seed_test_user(db: AsyncSession, personal_plan_id: uuid.UUID) -> None:
    """Create a test user with paid Pessoal subscription (no promotion) for payment testing."""
    existing = await db.execute(select(User).where(User.phone == TEST_USER_PHONE))
    if existing.scalar_one_or_none():
        print(f"Test user already exists ({TEST_USER_PHONE}), skipping.")
        return

    test_user = User(
        phone=TEST_USER_PHONE,
        name=TEST_USER_NAME,
        password_hash=hash_password(TEST_USER_PASSWORD),
        country="AO",
        language="pt-AO",
        onboarding_completed=True,
    )
    db.add(test_user)
    await db.flush()

    # Get the plan for snapshot
    plan = await db.get(Plan, personal_plan_id)
    if not plan:
        print("  WARNING: Pessoal plan not found, skipping subscription")
        return

    from app.services.billing import create_plan_snapshot

    from datetime import UTC, datetime, timedelta

    now = datetime.now(UTC)
    sub = UserSubscription(
        user_id=test_user.id,
        plan_id=plan.id,
        plan_snapshot=create_plan_snapshot(plan),
        billing_cycle=BillingCycle.MONTHLY,
        status=SubscriptionStatus.ACTIVE,
        base_price=plan.base_price_monthly,
        discount_amount=0,
        extra_members_count=0,
        extra_members_cost=0,
        module_addons_cost=0,
        final_price=plan.base_price_monthly,
        start_date=now,
        end_date=now + timedelta(days=30),
        auto_renew=True,
    )
    db.add(sub)
    await db.flush()

    # Sync permissions
    from app.services.permission import sync_user_permissions_from_plan
    await sync_user_permissions_from_plan(db, test_user.id, sub.plan_snapshot)

    print(f"Test user created: {TEST_USER_NAME} ({TEST_USER_PHONE})")
    print(f"  Password: {TEST_USER_PASSWORD}")
    print(f"  Plan: Pessoal (paid, no promotion)")
    print(f"  Price: {plan.base_price_monthly // 100} Kz/mes")


async def main() -> None:
    async with async_session() as db:
        print("=" * 60)
        print("O Financeiro — Production Seed")
        print("=" * 60)
        print()

        # 1. System categories
        print("--- Categories ---")
        cat_count = await seed_categories(db)

        # 2. Permissions
        print("\n--- Permissions ---")
        perm_count = await seed_permissions(db)

        # 3. Plans
        print("\n--- Plans ---")
        personal_id, family_id = await seed_plans(db)

        # 4. Plan permissions
        print("\n--- Plan Permissions ---")
        if personal_id and family_id:
            personal_perms = get_plan_permissions("personal")
            family_perms = get_plan_permissions("family")
            await seed_plan_permissions(db, personal_id, personal_perms)
            await seed_plan_permissions(db, family_id, family_perms)
            print(f"Assigned: Pessoal ({len(personal_perms)} perms), Familiar ({len(family_perms)} perms)")

        # 5. Company settings
        print("\n--- Company Settings ---")
        await seed_company_settings(db)

        # 6. Trial promotion (30 days free for new users)
        print("\n--- Trial Promotion ---")
        await seed_trial_promotion(db)

        # 6. Admin roles
        print("\n--- Admin Roles ---")
        roles = await seed_admin_roles(db)

        # 7. Admin user
        print("\n--- Admin User ---")
        await seed_admin_user(db, roles)

        # 8. Test user (paid subscription, no promotion — for payment testing)
        if personal_id:
            print("\n--- Test User ---")
            await seed_test_user(db, personal_id)

        await db.commit()

        print()
        print("=" * 60)
        print("Production seed completed!")
        print("=" * 60)
        print()
        print("Summary:")
        print(f"  Categories: {cat_count or 'already existed'}")
        print(f"  Permissions: {perm_count or 'already existed'}")
        print(f"  Plans: Pessoal + Familiar")
        print(f"  Trial: {TRIAL_FREE_DAYS} days free (auto-apply)")
        print(f"  Test user: {TEST_USER_PHONE} (paid Pessoal, no promo)")
        print(f"  Admin roles: super_admin, support, billing_admin")
        print(f"  Admin user: {ADMIN_PHONE}")
        print()
        print("Next steps:")
        print("  1. Change admin password after first login")
        print("  2. Configure Stripe keys for real payments")
        print("  3. Configure Anthropic/OpenAI keys for AI features")
        print("  4. Verify cron jobs are running")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
