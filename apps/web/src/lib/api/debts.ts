import { apiFetch } from "./client"

export interface Debt {
  id: string
  name: string
  type: string
  nature?: string
  creditor?: string | null
  creditor_type?: string | null
  original_amount: number
  remaining_balance: number
  current_balance?: number
  interest_rate: number
  minimum_payment: number
  due_day: number
  status: string
  is_active?: boolean
  auto_pay?: boolean
  linked_account_id?: string | null
}

export interface DebtSimulation {
  total_interest: number
  total_paid: number
  months_to_payoff: number
  months_saved?: number
  interest_saved?: number
  schedule?: { month: number; payment: number; principal: number; interest: number; balance: number }[]
}

export interface CreateDebtData {
  name: string
  type: string
  original_amount: number
  interest_rate?: number
  minimum_payment?: number
  due_day?: number
  nature?: string
  creditor_type?: string
  auto_pay?: boolean
  linked_account_id?: string
}

export interface SimulateParams {
  current_balance: number
  monthly_payment: number
  interest_rate?: number
  extra_payment?: number
}

type H = { headers?: Record<string, string> }

export const debtsApi = {
  list: (opts?: H) =>
    apiFetch<Debt[]>("/api/v1/debts/", opts),

  create: (data: CreateDebtData, opts?: H) =>
    apiFetch<Debt>("/api/v1/debts/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  payment: (id: string, amount: number, opts?: H) =>
    apiFetch<{ success: boolean; remaining_balance: number }>(
      "/api/v1/debts/" + id + "/payment",
      { method: "POST", body: JSON.stringify({ amount }), ...opts },
    ),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/debts/" + id, { method: "DELETE", ...opts }),

  simulate: (params: SimulateParams) => {
    const qs = new URLSearchParams({
      current_balance: String(params.current_balance),
      monthly_payment: String(params.monthly_payment),
      ...(params.interest_rate != null ? { interest_rate: String(params.interest_rate) } : {}),
      ...(params.extra_payment != null ? { extra_payment: String(params.extra_payment) } : {}),
    })
    return apiFetch<DebtSimulation>("/api/v1/debts/simulate?" + qs)
  },
}
