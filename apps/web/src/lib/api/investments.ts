import { apiFetch } from "./client"

export interface Investment {
  id: string
  name: string
  type: string
  institution: string | null
  invested_amount: number
  current_value: number
  annual_return_rate: number
  start_date: string
  status: string
}

export interface CreateInvestmentData {
  name: string
  type: string
  institution?: string
  invested_amount: number
  current_value?: number
  annual_return_rate?: number
}

type H = { headers?: Record<string, string> }

export const investmentsApi = {
  list: (opts?: H) =>
    apiFetch<Investment[]>("/api/v1/investments/", opts),

  create: (data: CreateInvestmentData, opts?: H) =>
    apiFetch<Investment>("/api/v1/investments/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/investments/" + id, { method: "DELETE", ...opts }),
}
