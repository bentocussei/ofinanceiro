import { apiFetch } from "./client"

export interface Investment {
  id: string
  name: string
  type: string
  institution: string | null
  invested_amount: number
  current_value: number
  annual_return_rate: number
  interest_rate: number | null
  start_date: string
  maturity_date: string | null
  notes: string | null
  status: string
}

export interface CreateInvestmentData {
  name: string
  type: string
  institution?: string
  invested_amount: number
  current_value?: number
  annual_return_rate?: number
  interest_rate?: number
  start_date?: string
  maturity_date?: string
  notes?: string
}

export interface UpdateInvestmentData {
  name?: string
  type?: string
  institution?: string
  invested_amount?: number
  current_value?: number
  annual_return_rate?: number
  interest_rate?: number
  start_date?: string
  maturity_date?: string
  notes?: string
  status?: string
}

type H = { headers?: Record<string, string> }

interface PaginatedResponse<T> {
  items: T[]
  cursor: string | null
  has_more: boolean
}

export const investmentsApi = {
  list: (opts?: H) =>
    apiFetch<PaginatedResponse<Investment>>("/api/v1/investments/", opts)
      .then(r => r.items),

  listPage: (params?: string, opts?: H) =>
    apiFetch<PaginatedResponse<Investment>>(
      "/api/v1/investments/" + (params ? "?" + params : ""), opts
    ),

  create: (data: CreateInvestmentData, opts?: H) =>
    apiFetch<Investment>("/api/v1/investments/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: UpdateInvestmentData, opts?: H) =>
    apiFetch<Investment>("/api/v1/investments/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/investments/" + id, { method: "DELETE", ...opts }),
}
