import { apiFetch } from "./client"

export interface RecurringRule {
  id: string
  account_id: string | null
  category_id: string | null
  type: string
  amount: number
  description: string
  frequency: string
  day_of_month: number | null
  start_date: string | null
  next_due: string | null
  account_name?: string | null
  category_name?: string | null
}

export interface CreateRecurringRuleData {
  account_id?: string
  category_id?: string
  type: string
  amount: number
  description: string
  frequency: string
  day_of_month?: number
  start_date?: string
}

type H = { headers?: Record<string, string> }

export const recurringRulesApi = {
  list: (opts?: H) =>
    apiFetch<RecurringRule[]>("/api/v1/recurring-rules/", opts),

  create: (data: CreateRecurringRuleData, opts?: H) =>
    apiFetch<RecurringRule>("/api/v1/recurring-rules/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: CreateRecurringRuleData, opts?: H) =>
    apiFetch<RecurringRule>("/api/v1/recurring-rules/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/recurring-rules/" + id, { method: "DELETE", ...opts }),
}
