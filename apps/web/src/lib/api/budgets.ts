import { apiFetch } from "./client"

export interface Budget {
  id: string
  name: string | null
  method: string
  period_start: string
  period_end: string
  is_active: boolean
  items?: BudgetItem[]
}

export interface BudgetItem {
  id: string
  category_name: string
  limit_amount: number
  spent_amount: number
}

export interface BudgetItemStatus {
  category_id: string
  category_name: string
  category_icon: string | null
  limit_amount: number
  spent: number
  remaining: number
  percentage: number
}

export interface BudgetStatus {
  budget_id: string
  name: string | null
  days_remaining: number
  total_limit: number | null
  total_spent: number
  total_remaining: number
  percentage: number
  items: BudgetItemStatus[]
}

export interface CreateBudgetData {
  name: string
  method?: string
  period_start?: string
  period_end?: string
  total_limit?: number
  alert_threshold?: number
  alert_enabled?: boolean
}

export interface UpdateBudgetData {
  name?: string
  alert_threshold?: number
  alert_enabled?: boolean
}

type H = { headers?: Record<string, string> }

export const budgetsApi = {
  list: (params?: string, opts?: H) =>
    apiFetch<Budget[]>("/api/v1/budgets/" + (params ? "?" + params : ""), opts),

  status: (id: string, opts?: H) =>
    apiFetch<BudgetStatus>("/api/v1/budgets/" + id + "/status", opts),

  create: (data: CreateBudgetData, opts?: H) =>
    apiFetch<Budget>("/api/v1/budgets/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: UpdateBudgetData, opts?: H) =>
    apiFetch<Budget>("/api/v1/budgets/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/budgets/" + id, { method: "DELETE", ...opts }),
}
