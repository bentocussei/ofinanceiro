import { apiFetch } from "./client"

export interface Goal {
  id: string
  name: string
  type: string
  target_amount: number
  current_amount: number
  monthly_contribution: number | null
  status: string
  description?: string | null
  savings_account_id?: string | null
  target_date?: string | null
  auto_contribute?: boolean
  auto_contribute_day?: number | null
  contribution_amount?: number | null
  contribution_frequency?: string | null
  contributions?: { member_name: string; amount: number }[]
}

export interface GoalProgress {
  percentage: number
  remaining: number
  months_remaining: number | null
  contributions: { amount: number; note?: string; contributed_at: string }[]
}

export interface CreateGoalData {
  name: string
  target_amount: number
  type?: string
  monthly_contribution?: number
  description?: string
  savings_account_id?: string
  contribution_frequency?: string
  target_date?: string
  auto_contribute?: boolean
  auto_contribute_day?: number
}

export interface UpdateGoalData {
  name?: string
  target_amount?: number
  description?: string
  savings_account_id?: string
  contribution_frequency?: string
  target_date?: string
  auto_contribute?: boolean
  auto_contribute_day?: number
  contribution_amount?: number
}

type H = { headers?: Record<string, string> }

export const goalsApi = {
  list: (params?: string, opts?: H) =>
    apiFetch<Goal[]>("/api/v1/goals/" + (params ? "?" + params : ""), opts),

  progress: (id: string, opts?: H) =>
    apiFetch<GoalProgress>("/api/v1/goals/" + id + "/progress", opts),

  create: (data: CreateGoalData, opts?: H) =>
    apiFetch<Goal>("/api/v1/goals/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: UpdateGoalData, opts?: H) =>
    apiFetch<Goal>("/api/v1/goals/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  contribute: (id: string, amount: number, opts?: H) =>
    apiFetch<void>("/api/v1/goals/" + id + "/contribute", {
      method: "POST",
      body: JSON.stringify({ amount }),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/goals/" + id, { method: "DELETE", ...opts }),
}
