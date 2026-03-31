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
  from_account_id?: string
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

export interface AllocationItem {
  type: string
  label: string
  invested: number
  current_value: number
  percentage: number
  count: number
}

export interface AllocationData {
  total_invested: number
  total_current_value: number
  allocation: AllocationItem[]
  concentration_warning: string | null
}

export interface PerformanceMonth {
  period: string
  invested: number
  value: number
  return_pct: number
}

export interface PerformanceHistory {
  months: PerformanceMonth[]
}

export interface InvestmentInsight {
  type: string
  severity: string
  title: string
  description: string
  recommendation: string
}

export interface InsightsData {
  insights: InvestmentInsight[]
  ai_generated: boolean
  risk_profile: string
  diversification_score: number
}

export interface InvestmentAskResponse {
  answer: string
  ai_generated: boolean
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

  allocation: (opts?: H) =>
    apiFetch<AllocationData>("/api/v1/investments/allocation", opts),

  performanceHistory: (opts?: H) =>
    apiFetch<PerformanceHistory>("/api/v1/investments/performance-history", opts),

  insights: (opts?: H) =>
    apiFetch<InsightsData>("/api/v1/investments/insights", opts),

  ask: (question: string, opts?: H) =>
    apiFetch<InvestmentAskResponse>("/api/v1/investments/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
      ...opts,
    }),
}
