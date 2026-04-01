"""Billing service: subscription lifecycle, pricing, promotions, feature access."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import (
    BillingCycle,
    PlanType,
    PromotionType,
    SubscriptionStatus,
)
from app.models.module_addon import ModuleAddon
from app.models.plan import Plan
from app.models.promotion import Promotion, PromotionUsage
from app.models.subscription import SubscriptionAddon, UserSubscription
from app.models.family import Family, FamilyMember
from app.schemas.billing import PriceBreakdown


# ---------------------------------------------------------------------------
# Price calculation
# ---------------------------------------------------------------------------

async def calculate_price(
    db: AsyncSession,
    plan: Plan,
    billing_cycle: BillingCycle,
    promotion: Promotion | None = None,
    extra_members: int = 0,
    addons: list[ModuleAddon] | None = None,
) -> PriceBreakdown:
    """Calculate the final price for a subscription.

    All amounts are in centavos.
    """
    # 1. Base price
    if billing_cycle == BillingCycle.MONTHLY:
        base = plan.base_price_monthly
    else:
        base = plan.base_price_annual

    # 2. Promotion discount
    discount = 0
    promotion_name: str | None = None
    free_days = 0

    if promotion:
        promotion_name = promotion.name
        if promotion.type == PromotionType.PERCENTAGE:
            discount = base * promotion.value // 100
        elif promotion.type == PromotionType.FIXED_AMOUNT:
            discount = promotion.value
        elif promotion.type == PromotionType.FREE_DAYS:
            discount = base  # full discount for the period
            free_days = promotion.free_days or promotion.value

    # 3. Discounted base
    discounted = max(0, base - discount)

    # 4. Extra members cost (only charge beyond plan's included members)
    billable_extra = max(0, extra_members - plan.max_family_members)
    extra_cost = billable_extra * plan.extra_member_cost

    # 5. Add-on cost
    addon_cost = 0
    if addons:
        for addon in addons:
            if billing_cycle == BillingCycle.MONTHLY:
                addon_cost += addon.price_monthly
            else:
                addon_cost += addon.price_annual

    # 6. Final
    final = discounted + extra_cost + addon_cost

    return PriceBreakdown(
        base_price=base,
        billing_cycle=billing_cycle,
        discount_amount=discount,
        promotion_name=promotion_name,
        free_days=free_days,
        extra_members_count=extra_members,
        extra_members_cost=extra_cost,
        module_addons_cost=addon_cost,
        final_price=final,
        currency=plan.currency.value if hasattr(plan.currency, "value") else str(plan.currency),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_plan_snapshot(plan: Plan) -> dict:
    """Create a JSON-serialisable snapshot of a plan at subscription time."""
    return {
        "id": str(plan.id),
        "type": str(plan.type.value) if hasattr(plan.type, "value") else str(plan.type),
        "name": plan.name,
        "description": plan.description,
        "base_price_monthly": plan.base_price_monthly,
        "base_price_annual": plan.base_price_annual,
        "currency": str(plan.currency.value) if hasattr(plan.currency, "value") else str(plan.currency),
        "max_family_members": plan.max_family_members,
        "extra_member_cost": plan.extra_member_cost,
        "features": plan.features or {},
    }


def _period_end(start: datetime, cycle: BillingCycle) -> datetime:
    """Calculate end date for a billing cycle."""
    if cycle == BillingCycle.MONTHLY:
        return start + timedelta(days=30)
    return start + timedelta(days=365)


async def _get_plan_or_404(db: AsyncSession, plan_id: str | uuid.UUID) -> Plan:
    plan_uuid = uuid.UUID(plan_id) if isinstance(plan_id, str) else plan_id
    stmt = select(Plan).where(Plan.id == plan_uuid, Plan.is_active.is_(True))
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plano não encontrado ou inactivo.",
        )
    return plan


# ---------------------------------------------------------------------------
# Subscription lifecycle
# ---------------------------------------------------------------------------

async def subscribe(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: str,
    billing_cycle: BillingCycle = BillingCycle.MONTHLY,
    promo_code: str | None = None,
) -> UserSubscription:
    """Create a new subscription for a user.

    Cancels any existing active subscription first.
    """
    # Check for existing active subscription
    existing = await get_active_subscription(db, user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já tens uma subscrição activa. Cancela primeiro ou faz upgrade.",
        )

    plan = await _get_plan_or_404(db, plan_id)

    # Validate and apply promotion
    promotion: Promotion | None = None
    if promo_code:
        promotion = await validate_promotion(
            db,
            promo_code,
            plan.type.value if hasattr(plan.type, "value") else str(plan.type),
        )
        if not promotion:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código promocional inválido ou expirado.",
            )

    # Calculate price
    breakdown = await calculate_price(db, plan, billing_cycle, promotion)

    now = datetime.now(timezone.utc)
    end = _period_end(now, billing_cycle)

    # Trial end from free_days promotion
    trial_end: datetime | None = None
    if breakdown.free_days > 0:
        trial_end = now + timedelta(days=breakdown.free_days)

    sub = UserSubscription(
        user_id=user_id,
        plan_id=plan.id,
        plan_snapshot=create_plan_snapshot(plan),
        billing_cycle=billing_cycle,
        status=SubscriptionStatus.TRIALING if trial_end else SubscriptionStatus.ACTIVE,
        base_price=breakdown.base_price,
        discount_amount=breakdown.discount_amount,
        extra_members_count=breakdown.extra_members_count,
        extra_members_cost=breakdown.extra_members_cost,
        module_addons_cost=breakdown.module_addons_cost,
        final_price=breakdown.final_price,
        promotion_id=promotion.id if promotion else None,
        start_date=now,
        end_date=end,
        trial_end_date=trial_end,
        auto_renew=True,
    )
    db.add(sub)

    await db.flush()

    # Sync plan permissions
    from app.services.permission import sync_user_permissions_from_plan
    await sync_user_permissions_from_plan(db, user_id, sub.plan_snapshot)

    # Record promotion usage
    if promotion:
        await record_promotion_usage(
            db, promotion, user_id, sub.id, breakdown.discount_amount
        )

    await db.refresh(sub)
    return sub


async def get_active_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserSubscription | None:
    """Get the current active (or trialing) subscription for a user."""
    stmt = (
        select(UserSubscription)
        .where(
            UserSubscription.user_id == user_id,
            UserSubscription.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.TRIALING,
            ]),
        )
        .order_by(UserSubscription.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def upgrade_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    target_plan_id: str,
    extra_members: int = 0,
) -> UserSubscription:
    """Upgrade an existing subscription to a higher plan.

    Cancels current and creates a new one immediately.
    """
    current = await get_active_subscription(db, user_id)
    if not current:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Não tens uma subscrição activa para fazer upgrade.",
        )

    target_plan = await _get_plan_or_404(db, target_plan_id)

    # Ensure it's actually an upgrade (target is more expensive)
    current_base = current.base_price
    if current.billing_cycle == BillingCycle.MONTHLY:
        target_base = target_plan.base_price_monthly
    else:
        target_base = target_plan.base_price_annual

    if target_base < current_base:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O plano alvo é inferior ao actual. Usa downgrade em vez disso.",
        )

    # Cancel current
    current.status = SubscriptionStatus.CANCELLED
    current.cancelled_at = datetime.now(timezone.utc)

    # Calculate new price with extra members
    breakdown = await calculate_price(
        db, target_plan, current.billing_cycle, extra_members=extra_members
    )

    now = datetime.now(timezone.utc)
    end = _period_end(now, current.billing_cycle)

    new_sub = UserSubscription(
        user_id=user_id,
        plan_id=target_plan.id,
        plan_snapshot=create_plan_snapshot(target_plan),
        billing_cycle=current.billing_cycle,
        status=SubscriptionStatus.ACTIVE,
        base_price=breakdown.base_price,
        discount_amount=breakdown.discount_amount,
        extra_members_count=breakdown.extra_members_count,
        extra_members_cost=breakdown.extra_members_cost,
        module_addons_cost=breakdown.module_addons_cost,
        final_price=breakdown.final_price,
        start_date=now,
        end_date=end,
        auto_renew=True,
    )
    db.add(new_sub)
    await db.flush()

    # Sync plan permissions for the new plan
    from app.services.permission import sync_user_permissions_from_plan
    await sync_user_permissions_from_plan(db, user_id, new_sub.plan_snapshot)

    await db.refresh(new_sub)
    return new_sub


async def downgrade_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserSubscription:
    """Mark a subscription to not renew (effective downgrade at period end).

    The user keeps access until end_date, then falls back to free.
    """
    sub = await get_active_subscription(db, user_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Não tens uma subscrição activa.",
        )

    sub.auto_renew = False

    # When downgrade takes effect at period end, permissions will be synced
    # by the renewal job. For now, user keeps current plan permissions.

    await db.flush()
    await db.refresh(sub)
    return sub


async def cancel_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserSubscription:
    """Cancel a subscription immediately."""
    sub = await get_active_subscription(db, user_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Não tens uma subscrição activa para cancelar.",
        )

    sub.status = SubscriptionStatus.CANCELLED
    sub.cancelled_at = datetime.now(timezone.utc)
    sub.auto_renew = False
    await db.flush()
    await db.refresh(sub)
    return sub


async def reactivate_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserSubscription:
    """Reactivate a cancelled subscription if still within the billing period."""
    stmt = (
        select(UserSubscription)
        .where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.CANCELLED,
        )
        .order_by(UserSubscription.cancelled_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Não encontrámos uma subscrição cancelada para reactivar.",
        )

    now = datetime.now(timezone.utc)
    if sub.end_date < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O período da subscrição já terminou. Cria uma nova subscrição.",
        )

    sub.status = SubscriptionStatus.ACTIVE
    sub.cancelled_at = None
    sub.auto_renew = True
    await db.flush()
    await db.refresh(sub)
    return sub


# ---------------------------------------------------------------------------
# Promotions
# ---------------------------------------------------------------------------

async def validate_promotion(
    db: AsyncSession,
    code: str,
    plan_type: str | None,
) -> Promotion | None:
    """Validate a promo code for a given plan type.

    Returns the Promotion if valid, None otherwise.
    """
    now = datetime.now(timezone.utc)
    stmt = select(Promotion).where(
        Promotion.code == code,
        Promotion.is_active.is_(True),
        Promotion.start_date <= now,
    )
    result = await db.execute(stmt)
    promo = result.scalar_one_or_none()

    if not promo:
        return None

    # Check end date
    if promo.end_date and promo.end_date < now:
        return None

    # Check plan type applicability (skip if no plan_type provided, e.g. register flow)
    if plan_type and not promo.apply_to_all and promo.applicable_plan_types:
        if plan_type not in promo.applicable_plan_types:
            return None

    # Check max beneficiaries
    if promo.max_beneficiaries is not None:
        if promo.current_usage_count >= promo.max_beneficiaries:
            return None

    return promo


async def apply_registration_promotion(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserSubscription | None:
    """Apply auto-register promotion to a new user, if one exists.

    Returns the created subscription or None.
    """
    promo = await get_auto_register_promotion(db)
    if not promo:
        return None

    # Find the cheapest active plan to apply the promotion to
    stmt = (
        select(Plan)
        .where(Plan.is_active.is_(True))
        .order_by(Plan.base_price_monthly.asc())
        .limit(1)
    )
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        return None

    breakdown = await calculate_price(
        db, plan, BillingCycle.MONTHLY, promotion=promo
    )

    now = datetime.now(timezone.utc)

    trial_end: datetime | None = None
    if breakdown.free_days > 0:
        trial_end = now + timedelta(days=breakdown.free_days)

    # Trial period uses free_days as end_date, otherwise normal billing cycle
    end = trial_end if trial_end else _period_end(now, BillingCycle.MONTHLY)

    sub = UserSubscription(
        user_id=user_id,
        plan_id=plan.id,
        plan_snapshot=create_plan_snapshot(plan),
        billing_cycle=BillingCycle.MONTHLY,
        status=SubscriptionStatus.TRIALING if trial_end else SubscriptionStatus.ACTIVE,
        base_price=breakdown.base_price,
        discount_amount=breakdown.discount_amount,
        extra_members_count=0,
        extra_members_cost=0,
        module_addons_cost=0,
        final_price=breakdown.final_price,
        promotion_id=promo.id,
        start_date=now,
        end_date=end,
        trial_end_date=trial_end,
        auto_renew=True,
    )
    db.add(sub)
    await db.flush()

    # Sync plan permissions for the trial subscription
    from app.services.permission import sync_user_permissions_from_plan
    await sync_user_permissions_from_plan(db, user_id, sub.plan_snapshot)

    await record_promotion_usage(
        db, promo, user_id, sub.id, breakdown.discount_amount
    )

    await db.refresh(sub)
    return sub


async def apply_promo_code_on_register(
    db: AsyncSession,
    user_id: uuid.UUID,
    promo_code: str,
) -> UserSubscription | None:
    """Apply a user-provided promo code during registration.

    Similar to apply_registration_promotion but uses a specific code
    instead of the auto-register promotion.
    """
    promo = await validate_promotion(db, promo_code, None)
    if not promo:
        return None

    # Find the cheapest active plan to apply the promotion to
    stmt = (
        select(Plan)
        .where(Plan.is_active.is_(True))
        .order_by(Plan.base_price_monthly.asc())
        .limit(1)
    )
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        return None

    breakdown = await calculate_price(
        db, plan, BillingCycle.MONTHLY, promotion=promo
    )

    now = datetime.now(timezone.utc)

    trial_end: datetime | None = None
    if breakdown.free_days > 0:
        trial_end = now + timedelta(days=breakdown.free_days)

    end = trial_end if trial_end else _period_end(now, BillingCycle.MONTHLY)

    sub = UserSubscription(
        user_id=user_id,
        plan_id=plan.id,
        plan_snapshot=create_plan_snapshot(plan),
        billing_cycle=BillingCycle.MONTHLY,
        status=SubscriptionStatus.TRIALING if trial_end else SubscriptionStatus.ACTIVE,
        base_price=breakdown.base_price,
        discount_amount=breakdown.discount_amount,
        extra_members_count=0,
        extra_members_cost=0,
        module_addons_cost=0,
        final_price=breakdown.final_price,
        promotion_id=promo.id,
        start_date=now,
        end_date=end,
        trial_end_date=trial_end,
        auto_renew=True,
    )
    db.add(sub)
    await db.flush()

    from app.services.permission import sync_user_permissions_from_plan
    await sync_user_permissions_from_plan(db, user_id, sub.plan_snapshot)

    await record_promotion_usage(
        db, promo, user_id, sub.id, breakdown.discount_amount
    )

    await db.refresh(sub)
    return sub


async def record_promotion_usage(
    db: AsyncSession,
    promotion: Promotion,
    user_id: uuid.UUID,
    subscription_id: uuid.UUID,
    discount_amount: int,
) -> PromotionUsage:
    """Record that a promotion was used by a user.

    Creates a PromotionUsage record and increments the promotion's usage counter.
    """
    usage = PromotionUsage(
        promotion_id=promotion.id,
        user_id=user_id,
        subscription_id=subscription_id,
        discount_amount=discount_amount,
    )
    db.add(usage)
    promotion.current_usage_count += 1
    await db.flush()
    await db.refresh(usage)
    return usage


async def get_auto_register_promotion(
    db: AsyncSession,
) -> Promotion | None:
    """Get the active auto-apply-on-register promotion, if any."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(Promotion)
        .where(
            Promotion.auto_apply_on_register.is_(True),
            Promotion.is_active.is_(True),
            Promotion.start_date <= now,
        )
        .order_by(Promotion.priority.asc())
        .limit(1)
    )
    result = await db.execute(stmt)
    promo = result.scalar_one_or_none()

    if not promo:
        return None

    # Check end date
    if promo.end_date and promo.end_date < now:
        return None

    # Check max beneficiaries
    if promo.max_beneficiaries is not None:
        if promo.current_usage_count >= promo.max_beneficiaries:
            return None

    return promo


# ---------------------------------------------------------------------------
# Feature access
# ---------------------------------------------------------------------------

async def get_user_features(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> dict:
    """Get the effective features dict for a user.

    Merges base plan features with any active add-on overrides.
    """
    sub = await get_active_subscription(db, user_id)
    if not sub:
        # Free tier — return default minimal features
        return _free_tier_features()

    # Start with plan features from snapshot
    features = dict(sub.plan_snapshot.get("features", {}))

    # Load active add-ons
    stmt = (
        select(SubscriptionAddon)
        .where(
            SubscriptionAddon.subscription_id == sub.id,
            SubscriptionAddon.is_active.is_(True),
        )
    )
    result = await db.execute(stmt)
    addons = result.scalars().all()

    for addon in addons:
        override = addon.addon_snapshot.get("features_override", {})
        features = _merge_features(features, override)

    return features


async def check_feature_access(
    db: AsyncSession,
    user_id: uuid.UUID,
    module: str,
    feature: str,
) -> bool:
    """Check if a user has access to a specific feature.

    Features dict structure: { "module_name": { "feature_name": True/False, ... } }
    """
    features = await get_user_features(db, user_id)
    module_features = features.get(module, {})

    if isinstance(module_features, bool):
        return module_features
    if isinstance(module_features, dict):
        return bool(module_features.get(feature, False))

    return False


async def check_usage_limit(
    db: AsyncSession,
    user_id: uuid.UUID,
    module: str,
    feature: str,
    current_count: int,
) -> bool:
    """Check if the user is within their usage limit for a feature.

    Features dict structure: { "module": { "feature_limit": 100 } }
    Returns True if within limit, False if exceeded.
    """
    features = await get_user_features(db, user_id)
    module_features = features.get(module, {})

    if isinstance(module_features, dict):
        limit_key = f"{feature}_limit"
        limit = module_features.get(limit_key)
        if limit is None:
            # No limit defined — unlimited
            return True
        if limit == -1:
            # Explicit unlimited
            return True
        return current_count < limit

    return False


def _free_tier_features() -> dict:
    """Default features for free-tier users."""
    return {
        "accounts": {"max_accounts": 3, "multi_currency": False},
        "transactions": {"max_monthly": 100, "ocr": False, "voice": False},
        "budgets": {"max_budgets": 1, "methods": ["category"]},
        "ai": {"chat_enabled": True, "messages_per_day": 10, "insights": False},
        "family": {"enabled": False},
        "goals": {"max_goals": 1},
        "reports": {"basic": True, "advanced": False, "export": False},
        "debts": {"max_debts": 3},
        "investments": {"enabled": False},
    }


def _merge_features(base: dict, override: dict) -> dict:
    """Deep-merge override features into base, with override taking precedence."""
    merged = dict(base)
    for key, value in override.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _merge_features(merged[key], value)
        else:
            merged[key] = value
    return merged


# ---------------------------------------------------------------------------
# Family billing
# ---------------------------------------------------------------------------

async def recalculate_family_cost(
    db: AsyncSession,
    admin_user_id: uuid.UUID,
) -> None:
    """Recalculate subscription cost based on current family member count.

    Called when members are added/removed from a family.
    """
    sub = await get_active_subscription(db, admin_user_id)
    if not sub:
        return

    # Only relevant for family plans
    plan_type = sub.plan_snapshot.get("type", "")
    if plan_type != PlanType.FAMILY.value:
        return

    # Count current family members (excluding the admin)
    stmt = (
        select(func.count())
        .select_from(FamilyMember)
        .join(Family, Family.id == FamilyMember.family_id)
        .where(
            Family.admin_user_id == admin_user_id,
            FamilyMember.user_id != admin_user_id,
            FamilyMember.is_active.is_(True),
        )
    )
    result = await db.execute(stmt)
    member_count = result.scalar() or 0

    max_included = sub.plan_snapshot.get("max_family_members", 0)
    extra_member_unit_cost = sub.plan_snapshot.get("extra_member_cost", 0)

    billable_extra = max(0, member_count - max_included)
    extra_cost = billable_extra * extra_member_unit_cost

    sub.extra_members_count = member_count
    sub.extra_members_cost = extra_cost
    sub.final_price = max(0, sub.base_price - sub.discount_amount) + extra_cost + sub.module_addons_cost

    await db.flush()


# ---------------------------------------------------------------------------
# Add-ons
# ---------------------------------------------------------------------------

async def add_addon_to_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    module_addon_id: str,
) -> SubscriptionAddon:
    """Add a feature add-on to the user's active subscription."""
    sub = await get_active_subscription(db, user_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Precisas de uma subscrição activa para adicionar extras.",
        )

    addon_uuid = uuid.UUID(module_addon_id)
    stmt = select(ModuleAddon).where(
        ModuleAddon.id == addon_uuid, ModuleAddon.is_active.is_(True)
    )
    result = await db.execute(stmt)
    addon = result.scalar_one_or_none()

    if not addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extra não encontrado ou inactivo.",
        )

    # Check if already added
    existing_stmt = select(SubscriptionAddon).where(
        SubscriptionAddon.subscription_id == sub.id,
        SubscriptionAddon.module_addon_id == addon_uuid,
        SubscriptionAddon.is_active.is_(True),
    )
    existing_result = await db.execute(existing_stmt)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este extra já está adicionado à tua subscrição.",
        )

    # Determine price
    if sub.billing_cycle == BillingCycle.MONTHLY:
        price = addon.price_monthly
    else:
        price = addon.price_annual

    addon_snapshot = {
        "id": str(addon.id),
        "name": addon.name,
        "module": addon.module,
        "features_override": addon.features_override or {},
        "price_monthly": addon.price_monthly,
        "price_annual": addon.price_annual,
    }

    sub_addon = SubscriptionAddon(
        subscription_id=sub.id,
        module_addon_id=addon.id,
        addon_snapshot=addon_snapshot,
        price=price,
        is_active=True,
    )
    db.add(sub_addon)

    # Recalculate subscription totals
    sub.module_addons_cost += price
    sub.final_price = (
        max(0, sub.base_price - sub.discount_amount)
        + sub.extra_members_cost
        + sub.module_addons_cost
    )

    await db.flush()

    # Grant permissions from the addon's features_override
    from app.services.permission import grant_user_permission
    features_override = addon.features_override or {}
    for module_key, module_features in features_override.items():
        if isinstance(module_features, dict):
            for feature_key, value in module_features.items():
                if value is True:
                    # Grant standard CRUD permissions for this feature
                    for action in ("create", "read", "update", "delete"):
                        code = f"{module_key}:{feature_key}:{action}"
                        await grant_user_permission(db, user_id, code, source="addon")
                elif isinstance(value, dict):
                    for action, enabled in value.items():
                        if enabled is True:
                            code = f"{module_key}:{feature_key}:{action}"
                            await grant_user_permission(db, user_id, code, source="addon")

    await db.refresh(sub_addon)
    return sub_addon


async def remove_addon_from_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    module_addon_id: str,
) -> None:
    """Remove a feature add-on from the user's active subscription."""
    sub = await get_active_subscription(db, user_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Não tens uma subscrição activa.",
        )

    addon_uuid = uuid.UUID(module_addon_id)
    stmt = select(SubscriptionAddon).where(
        SubscriptionAddon.subscription_id == sub.id,
        SubscriptionAddon.module_addon_id == addon_uuid,
        SubscriptionAddon.is_active.is_(True),
    )
    result = await db.execute(stmt)
    sub_addon = result.scalar_one_or_none()

    if not sub_addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este extra não está na tua subscrição.",
        )

    sub_addon.is_active = False

    # Revoke permissions from the addon's features_override
    from app.services.permission import revoke_user_permission
    features_override = sub_addon.addon_snapshot.get("features_override", {})
    for module_key, module_features in features_override.items():
        if isinstance(module_features, dict):
            for feature_key, value in module_features.items():
                if value is True:
                    for action in ("create", "read", "update", "delete"):
                        code = f"{module_key}:{feature_key}:{action}"
                        await revoke_user_permission(db, user_id, code)
                elif isinstance(value, dict):
                    for action, enabled in value.items():
                        if enabled is True:
                            code = f"{module_key}:{feature_key}:{action}"
                            await revoke_user_permission(db, user_id, code)

    # Recalculate subscription totals
    sub.module_addons_cost = max(0, sub.module_addons_cost - sub_addon.price)
    sub.final_price = (
        max(0, sub.base_price - sub.discount_amount)
        + sub.extra_members_cost
        + sub.module_addons_cost
    )

    await db.flush()


# ---------------------------------------------------------------------------
# Plan queries (for listing)
# ---------------------------------------------------------------------------

async def list_active_plans(
    db: AsyncSession,
    plan_type: PlanType | None = None,
) -> list[Plan]:
    """List all active plans, optionally filtered by type."""
    stmt = select(Plan).where(Plan.is_active.is_(True))
    if plan_type:
        stmt = stmt.where(Plan.type == plan_type)
    stmt = stmt.order_by(Plan.sort_order.asc(), Plan.base_price_monthly.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_active_addons(
    db: AsyncSession,
) -> list[ModuleAddon]:
    """List all active feature add-ons."""
    stmt = (
        select(ModuleAddon)
        .where(ModuleAddon.is_active.is_(True))
        .order_by(ModuleAddon.sort_order.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
