import { apiFetch } from "./client"

export interface PlanInfo {
  id: string
  type: string
  name: string
  description: string
  base_price_monthly: number
  base_price_annual: number
  max_family_members: number
  extra_member_cost: number
  features: Record<string, unknown>
}

export interface SubscriptionInfo {
  id: string
  plan_type: string
  plan_name: string
  billing_cycle: string
  status: string
  base_price: number
  discount_amount: number
  final_price: number
  start_date: string
  end_date: string
  trial_end_date: string | null
  auto_renew: boolean
  features: Record<string, unknown>
}

export interface PriceBreakdown {
  base_price: number
  billing_cycle: string
  discount_amount: number
  promotion_name: string | null
  free_days: number
  final_price: number
  currency: string
}

interface SubscribeData {
  plan_id: string
  billing_cycle: string
}

interface UpgradeData {
  plan_id: string
  billing_cycle?: string
}

export interface ModuleAddonInfo {
  id: string
  name: string
  module: string
  description: string | null
  price_monthly: number
  price_annual: number
  features_override: Record<string, unknown>
}

export interface PromoValidation {
  name: string
  type: string
  value: number
  free_days: number
  description: string
}

export const billingApi = {
  validatePromo: (code: string) =>
    apiFetch<PromoValidation>("/api/v1/billing/validate-promo", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  plans: () =>
    apiFetch<PlanInfo[]>("/api/v1/billing/plans"),

  subscription: () =>
    apiFetch<SubscriptionInfo>("/api/v1/billing/subscription"),

  subscribe: (data: SubscribeData) =>
    apiFetch<SubscriptionInfo>("/api/v1/billing/subscribe", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  previewPrice: (data: SubscribeData) =>
    apiFetch<PriceBreakdown>("/api/v1/billing/preview-price", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  upgrade: (data: UpgradeData) =>
    apiFetch<SubscriptionInfo>("/api/v1/billing/upgrade", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancel: () =>
    apiFetch<{ message: string }>("/api/v1/billing/cancel", {
      method: "POST",
    }),

  reactivate: () =>
    apiFetch<SubscriptionInfo>("/api/v1/billing/reactivate", {
      method: "POST",
    }),

  applyPromo: (code: string) =>
    apiFetch<{ message: string; discount: number }>("/api/v1/billing/apply-promo", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  addons: () =>
    apiFetch<ModuleAddonInfo[]>("/api/v1/billing/addons"),

  addAddon: (addonId: string) =>
    apiFetch<{ success: boolean }>("/api/v1/billing/addons/" + addonId + "/add", {
      method: "POST",
    }),

  removeAddon: (addonId: string) =>
    apiFetch<{ success: boolean }>("/api/v1/billing/addons/" + addonId + "/remove", {
      method: "DELETE",
    }),
}
