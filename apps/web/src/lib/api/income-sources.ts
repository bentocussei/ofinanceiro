import { apiFetch } from "./client"

export interface IncomeSource {
  id: string
  name: string
  type: string
  expected_amount: number
  frequency: string
  day_of_month: number | null
  account_id: string | null
  description?: string | null
  account_name?: string | null
}

export interface CreateIncomeSourceData {
  name: string
  type: string
  expected_amount: number
  frequency: string
  day_of_month?: number
  account_id?: string
  description?: string
}

type H = { headers?: Record<string, string> }

interface PaginatedResponse<T> {
  items: T[]
  cursor: string | null
  has_more: boolean
}

export const incomeSourcesApi = {
  list: (opts?: H) =>
    apiFetch<PaginatedResponse<IncomeSource>>("/api/v1/income-sources/", opts)
      .then(r => r.items),

  listPage: (params?: string, opts?: H) =>
    apiFetch<PaginatedResponse<IncomeSource>>(
      "/api/v1/income-sources/" + (params ? "?" + params : ""), opts
    ),

  create: (data: CreateIncomeSourceData, opts?: H) =>
    apiFetch<IncomeSource>("/api/v1/income-sources/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: CreateIncomeSourceData, opts?: H) =>
    apiFetch<IncomeSource>("/api/v1/income-sources/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/income-sources/" + id, { method: "DELETE", ...opts }),
}
