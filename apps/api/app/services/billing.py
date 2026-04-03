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


def calculate_proration_credit(
    current_price: int,
    billing_cycle: BillingCycle,
    start_date: datetime,
    now: datetime,
) -> int:
    """Calculate unused credit in centavos for remaining days in current period."""
    total_days = 365 if billing_cycle == BillingCycle.ANNUAL else 30
    elapsed = max(0, (now - start_date).days)
    remaining = max(0, total_days - elapsed)
    return (current_price * remaining) // total_days


async def get_auto_apply_promotion_for_plan(
    db: AsyncSession,
    plan_type: str,
) -> Promotion | None:
    """Find active auto-apply promotion applicable to a target plan."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(Promotion)
        .where(
            Promotion.auto_apply_on_register.is_(True),
            Promotion.is_active.is_(True),
            Promotion.start_date <= now,
        )
        .order_by(Promotion.priority.asc())
    )
    result = await db.execute(stmt)
    promos = result.scalars().all()

    for promo in promos:
        if promo.end_date and promo.end_date < now:
            continue
        if promo.max_beneficiaries is not None and promo.current_usage_count >= promo.max_beneficiaries:
            continue
        if not promo.apply_to_all and promo.applicable_plan_types:
            if plan_type not in promo.applicable_plan_types:
                continue
        return promo
    return None


def _get_target_base_price(plan: Plan, cycle: BillingCycle) -> int:
    """Get the base price for a plan at a given billing cycle."""
    if cycle == BillingCycle.MONTHLY:
        return plan.base_price_monthly
    return plan.base_price_annual


async def preview_plan_change(
    db: AsyncSession,
    user_id: uuid.UUID,
    target_plan_id: str,
    target_billing_cycle: BillingCycle | None = None,
    extra_members: int = 0,
) -> dict:
    """Preview a plan/cycle change with proration details.

    Returns dict with: is_immediate, proration_credit, amount_due_now,
    new_price, effective_date, breakdown.
    """
    current = await get_active_subscription(db, user_id)
    if not current:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nao tens uma subscricao activa.",
        )

    target_plan = await _get_plan_or_404(db, target_plan_id)
    new_cycle = target_billing_cycle or current.billing_cycle
    now = datetime.now(timezone.utc)

    # Determine direction
    current_monthly = current.plan_snapshot.get("base_price_monthly", current.base_price)
    target_monthly = target_plan.base_price_monthly
    is_plan_upgrade = target_monthly > current_monthly
    is_cycle_upgrade = (current.billing_cycle == BillingCycle.MONTHLY and new_cycle == BillingCycle.ANNUAL)
    is_immediate = is_plan_upgrade or is_cycle_upgrade

    # Check for auto-apply promotion
    plan_type = target_plan.type.value if hasattr(target_plan.type, "value") else str(target_plan.type)
    promotion = await get_auto_apply_promotion_for_plan(db, plan_type)

    # Calculate new price
    breakdown = await calculate_price(
        db, target_plan, new_cycle, promotion=promotion, extra_members=extra_members
    )

    proration_credit = 0
    amount_due_now = 0

    if is_immediate:
        # Calculate credit from unused portion of current plan
        proration_credit = calculate_proration_credit(
            current.final_price, current.billing_cycle, current.start_date, now
        )
        amount_due_now = max(0, breakdown.final_price - proration_credit)

    effective_date = now if is_immediate else current.end_date

    return {
        "is_immediate": is_immediate,
        "proration_credit": proration_credit,
        "amount_due_now": amount_due_now,
        "new_price": breakdown.final_price,
        "new_cycle": new_cycle.value,
        "effective_date": effective_date.isoformat(),
        "target_plan_name": target_plan.name,
        "target_plan_type": plan_type,
        "promotion_applied": promotion.name if promotion else None,
        "breakdown": breakdown,
    }


async def change_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    target_plan_id: str,
    target_billing_cycle: BillingCycle | None = None,
    extra_members: int = 0,
) -> UserSubscription:
    """Change plan and/or billing cycle. Detects direction automatically.

    Upgrade (higher plan or monthly→annual): immediate, with proration credit.
    Downgrade (lower plan or annual→monthly): scheduled for end of period.
    Updates the existing subscription in place.
    """
    # Lock subscription to prevent race conditions
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
        .with_for_update()
    )
    result = await db.execute(stmt)
    current = result.scalar_one_or_none()

    if not current:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nao tens uma subscricao activa.",
        )

    target_plan = await _get_plan_or_404(db, target_plan_id)
    new_cycle = target_billing_cycle or current.billing_cycle
    now = datetime.now(timezone.utc)

    # Prevent no-op changes (same plan and same cycle)
    if current.plan_id == target_plan.id and current.billing_cycle == new_cycle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ja estas neste plano e periodicidade.",
        )

    # Determine direction
    current_monthly = current.plan_snapshot.get("base_price_monthly", current.base_price)
    target_monthly = target_plan.base_price_monthly
    is_plan_upgrade = target_monthly > current_monthly
    is_cycle_upgrade = (current.billing_cycle == BillingCycle.MONTHLY and new_cycle == BillingCycle.ANNUAL)
    is_immediate = is_plan_upgrade or is_cycle_upgrade

    # Check for auto-apply promotion
    plan_type = target_plan.type.value if hasattr(target_plan.type, "value") else str(target_plan.type)
    promotion = await get_auto_apply_promotion_for_plan(db, plan_type)

    # Calculate new price
    breakdown = await calculate_price(
        db, target_plan, new_cycle, promotion=promotion, extra_members=extra_members
    )

    if is_immediate:
        # --- IMMEDIATE: upgrade plan or monthly→annual ---
        proration_credit = calculate_proration_credit(
            current.final_price, current.billing_cycle, current.start_date, now
        )
        amount_due_now = max(0, breakdown.final_price - proration_credit)

        # Preserve trial status and dates
        is_trialing = current.status == SubscriptionStatus.TRIALING
        original_trial_end = current.trial_end_date

        # If on trial, preserve trial end date and don't charge
        if is_trialing and original_trial_end and original_trial_end > now:
            # Trial carries over to new plan — keep trial dates
            new_end_date = original_trial_end
            amount_due_now = 0  # No charge during trial
        else:
            new_end_date = _period_end(now, new_cycle)

        # Update subscription in place
        current.plan_id = target_plan.id
        current.plan_snapshot = create_plan_snapshot(target_plan)
        current.billing_cycle = new_cycle
        current.base_price = breakdown.base_price
        current.discount_amount = breakdown.discount_amount
        current.extra_members_count = breakdown.extra_members_count
        current.extra_members_cost = breakdown.extra_members_cost
        current.final_price = breakdown.final_price
        current.proration_credit = proration_credit
        current.start_date = now
        current.end_date = new_end_date
        # Preserve trial status if still trialing
        if is_trialing and original_trial_end and original_trial_end > now:
            current.status = SubscriptionStatus.TRIALING
        else:
            current.status = SubscriptionStatus.ACTIVE
        current.promotion_id = promotion.id if promotion else current.promotion_id

        # Clear any pending change
        current.pending_plan_id = None
        current.pending_billing_cycle = None
        current.pending_change_scheduled_at = None

        # Sync permissions
        from app.services.permission import sync_user_permissions_from_plan
        await sync_user_permissions_from_plan(db, user_id, current.plan_snapshot)

        # Record promotion usage if new
        if promotion:
            await record_promotion_usage(
                db, promotion, user_id, current.id, breakdown.discount_amount
            )

        await db.flush()

        # Charge the proration difference (only if not on trial and amount > 0)
        if amount_due_now > 0:
            from app.services import payment as payment_service
            pm = await payment_service.get_default_payment_method(db, user_id)
            if pm:
                try:
                    await payment_service.charge_subscription(db, current, pm)
                except Exception:
                    import logging
                    logging.getLogger(__name__).exception(
                        "Cobranca de prorateio falhou para user %s", user_id
                    )
    else:
        # --- SCHEDULED: downgrade or annual→monthly ---
        current.pending_plan_id = target_plan.id
        current.pending_billing_cycle = new_cycle
        current.pending_change_scheduled_at = now

    await db.flush()
    await db.refresh(current)
    return current


async def cancel_pending_change(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserSubscription:
    """Cancel a scheduled plan/cycle change."""
    sub = await get_active_subscription(db, user_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nao tens uma subscricao activa.",
        )

    if not sub.pending_plan_id and not sub.pending_billing_cycle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao tens nenhuma mudanca de plano agendada.",
        )

    sub.pending_plan_id = None
    sub.pending_billing_cycle = None
    sub.pending_change_scheduled_at = None
    await db.flush()
    await db.refresh(sub)
    return sub


async def apply_pending_change(
    db: AsyncSession,
    sub: UserSubscription,
) -> None:
    """Apply a pending plan/cycle change. Called by auto-billing at renewal."""
    if not sub.pending_plan_id:
        return

    target_plan = await db.get(Plan, sub.pending_plan_id)
    if not target_plan or not target_plan.is_active:
        # Plan no longer available, clear pending
        sub.pending_plan_id = None
        sub.pending_billing_cycle = None
        sub.pending_change_scheduled_at = None
        return

    new_cycle = sub.pending_billing_cycle or sub.billing_cycle

    # Check for promotion
    plan_type = target_plan.type.value if hasattr(target_plan.type, "value") else str(target_plan.type)
    promotion = await get_auto_apply_promotion_for_plan(db, plan_type)

    breakdown = await calculate_price(db, target_plan, new_cycle, promotion=promotion)

    sub.plan_id = target_plan.id
    sub.plan_snapshot = create_plan_snapshot(target_plan)
    sub.billing_cycle = new_cycle
    sub.base_price = breakdown.base_price
    sub.discount_amount = breakdown.discount_amount
    sub.extra_members_count = breakdown.extra_members_count
    sub.extra_members_cost = breakdown.extra_members_cost
    sub.final_price = breakdown.final_price
    sub.promotion_id = promotion.id if promotion else None
    sub.proration_credit = 0

    # Clear pending
    sub.pending_plan_id = None
    sub.pending_billing_cycle = None
    sub.pending_change_scheduled_at = None

    # Sync permissions
    from app.services.permission import sync_user_permissions_from_plan
    await sync_user_permissions_from_plan(db, sub.user_id, sub.plan_snapshot)


# Legacy aliases for backward compatibility
async def upgrade_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    target_plan_id: str,
    extra_members: int = 0,
) -> UserSubscription:
    """Legacy: use change_subscription instead."""
    return await change_subscription(db, user_id, target_plan_id, extra_members=extra_members)


async def downgrade_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserSubscription:
    """Mark subscription to not renew (legacy). Use change_subscription for plan changes."""
    sub = await get_active_subscription(db, user_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nao tens uma subscricao activa.",
        )
    sub.auto_renew = False
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
) -> PromotionUsage | None:
    """Record that a promotion was used by a user.

    Creates a PromotionUsage record and increments the promotion's usage counter.
    Skips if this user already used this promotion (unique constraint).
    """
    # Check if already recorded
    existing = await db.scalar(
        select(PromotionUsage).where(
            PromotionUsage.promotion_id == promotion.id,
            PromotionUsage.user_id == user_id,
        )
    )
    if existing:
        return existing

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
