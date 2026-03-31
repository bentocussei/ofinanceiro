import { apiFetch } from "./client"

export type AssetType =
  | "real_estate"
  | "vehicle"
  | "land"
  | "jewelry"
  | "art"
  | "electronics"
  | "furniture"
  | "livestock"
  | "business_equity"
  | "other"

export interface Asset {
  id: string
  name: string
  type: AssetType
  type_label: string
  description: string | null
  purchase_price: number
  purchase_date: string | null
  current_value: number
  last_valuation_date: string | null
  currency: string
  annual_change_rate: number | null
  details: Record<string, unknown>
  linked_debt_id: string | null
  linked_account_id: string | null
  is_active: boolean
  sold_at: string | null
  sold_price: number | null
  is_insured: boolean
  insurance_value: number | null
  insurance_expiry: string | null
  notes: string | null
  family_id: string | null
  appreciation: number
  appreciation_pct: number
  created_at: string | null
  updated_at: string | null
}

export interface AssetTypeSummary {
  type: AssetType
  label: string
  count: number
  total_value: number
}

export interface AssetSummary {
  total_value: number
  total_purchase_price: number
  total_appreciation: number
  by_type: AssetTypeSummary[]
  items: Asset[]
}

export interface CreateAssetData {
  name: string
  type: AssetType
  description?: string
  purchase_price: number
  purchase_date?: string
  current_value: number
  last_valuation_date?: string
  currency?: string
  annual_change_rate?: number
  details?: Record<string, unknown>
  linked_debt_id?: string
  linked_account_id?: string
  is_insured?: boolean
  insurance_value?: number
  insurance_expiry?: string
  notes?: string
  family_id?: string
  from_account_id?: string
}

export interface UpdateAssetData {
  name?: string
  type?: AssetType
  description?: string
  purchase_price?: number
  purchase_date?: string
  current_value?: number
  last_valuation_date?: string
  currency?: string
  annual_change_rate?: number
  details?: Record<string, unknown>
  linked_debt_id?: string
  linked_account_id?: string
  is_active?: boolean
  sold_at?: string
  sold_price?: number
  is_insured?: boolean
  insurance_value?: number
  insurance_expiry?: string
  notes?: string
  family_id?: string
}

export interface RevalueAssetData {
  current_value: number
  valuation_date?: string
}

type H = { headers?: Record<string, string> }

interface PaginatedResponse<T> {
  items: T[]
  cursor: string | null
  has_more: boolean
}

export const assetsApi = {
  list: (opts?: H) =>
    apiFetch<PaginatedResponse<Asset>>("/api/v1/assets/", opts)
      .then(r => r.items),

  listPage: (params?: string, opts?: H) =>
    apiFetch<PaginatedResponse<Asset>>(
      "/api/v1/assets/" + (params ? "?" + params : ""), opts
    ),

  summary: (opts?: H) =>
    apiFetch<AssetSummary>("/api/v1/assets/summary", opts),

  create: (data: CreateAssetData, opts?: H) =>
    apiFetch<Asset>("/api/v1/assets/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: UpdateAssetData, opts?: H) =>
    apiFetch<Asset>("/api/v1/assets/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/assets/" + id, { method: "DELETE", ...opts }),

  revalue: (id: string, data: RevalueAssetData, opts?: H) =>
    apiFetch<Asset>("/api/v1/assets/" + id + "/revalue", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),
}
