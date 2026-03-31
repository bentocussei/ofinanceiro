"""Pydantic v2 schemas for the billing module."""

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import BillingCycle, PlanType, PromotionType


# ---------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------

class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: PlanType
    name: str
    description: str | None
    base_price_monthly: int
    base_price_annual: int
    currency: str
    max_family_members: int
    extra_member_cost: int
    features: dict
    is_active: bool
    sort_order: int


class PlanCreate(BaseModel):
    type: PlanType
    name: str = Field(max_length=100)
    description: str | None = None
    base_price_monthly: int = Field(ge=0)
    base_price_annual: int = Field(ge=0)
    currency: str = "AOA"
    max_family_members: int = Field(0, ge=0)
    extra_member_cost: int = Field(0, ge=0)
    features: dict = {}
    sort_order: int = 0


class PlanUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = None
    base_price_monthly: int | None = Field(None, ge=0)
    base_price_annual: int | None = Field(None, ge=0)
    max_family_members: int | None = Field(None, ge=0)
    extra_member_cost: int | None = Field(None, ge=0)
    features: dict | None = None
    is_active: bool | None = None
    sort_order: int | None = None


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------

class SubscribeRequest(BaseModel):
    plan_id: str
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    promo_code: str | None = None


class UpgradeRequest(BaseModel):
    target_plan_id: str
    extra_members: int = Field(0, ge=0)


class PriceBreakdown(BaseModel):
    base_price: int
    billing_cycle: BillingCycle
    discount_amount: int = 0
    promotion_name: str | None = None
    free_days: int = 0
    extra_members_count: int = 0
    extra_members_cost: int = 0
    feature_addons_cost: int = 0
    final_price: int
    currency: str = "AOA"


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_type: str
    plan_name: str
    billing_cycle: BillingCycle
    status: str
    base_price: int
    discount_amount: int
    extra_members_count: int
    extra_members_cost: int
    feature_addons_cost: int
    final_price: int
    start_date: str
    end_date: str
    trial_end_date: str | None
    auto_renew: bool
    features: dict  # effective features (plan + addons)


# ---------------------------------------------------------------------------
# Promotion
# ---------------------------------------------------------------------------

class PromotionCreate(BaseModel):
    name: str = Field(max_length=100)
    code: str | None = Field(None, max_length=50)
    type: PromotionType
    value: int = Field(ge=0)
    start_date: str  # ISO datetime
    end_date: str | None = None
    apply_to_all: bool = True
    applicable_plan_types: list[str] = []
    max_beneficiaries: int | None = None
    auto_apply_on_register: bool = False
    free_days: int = Field(0, ge=0)


class PromotionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str | None
    type: PromotionType
    value: int
    start_date: str
    end_date: str | None
    apply_to_all: bool
    applicable_plan_types: list[str]
    max_beneficiaries: int | None
    current_usage_count: int
    auto_apply_on_register: bool
    free_days: int
    is_active: bool


class PromotionUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    end_date: str | None = None
    max_beneficiaries: int | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# Feature Add-on
# ---------------------------------------------------------------------------

class FeatureAddonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    module: str
    description: str | None
    price_monthly: int
    price_annual: int
    features_override: dict
    is_active: bool


class FeatureAddonCreate(BaseModel):
    name: str = Field(max_length=100)
    module: str = Field(max_length=50)
    description: str | None = None
    price_monthly: int = Field(ge=0)
    price_annual: int = Field(ge=0)
    features_override: dict = {}
    sort_order: int = 0


class FeatureAddonUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    module: str | None = Field(None, max_length=50)
    description: str | None = None
    price_monthly: int | None = Field(None, ge=0)
    price_annual: int | None = Field(None, ge=0)
    features_override: dict | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class AddAddonRequest(BaseModel):
    feature_addon_id: str
