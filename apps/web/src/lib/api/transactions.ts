import { apiFetch } from "./client"

export interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  merchant: string | null
  transaction_date: string
  created_at: string
  category_id?: string | null
  category_name?: string | null
  category_icon?: string | null
  member_name?: string | null
  account_id?: string
  notes?: string | null
  tags?: string[] | null
  is_private?: boolean
  needs_review?: boolean
  is_recurring?: boolean
}

export interface TransactionPage {
  items: Transaction[]
  cursor: string | null
  has_more: boolean
}

export interface CreateTransactionData {
  account_id: string
  amount: number
  type: string
  description?: string
  category_id?: string
  merchant?: string
  notes?: string
  tags?: string[]
  transaction_date?: string
  is_private?: boolean
  needs_review?: boolean
}

type H = { headers?: Record<string, string> }

export const transactionsApi = {
  list: (params?: string, opts?: H) =>
    apiFetch<TransactionPage>(
      "/api/v1/transactions/" + (params ? "?" + params : ""),
      opts,
    ),

  create: (data: CreateTransactionData, opts?: H) =>
    apiFetch<Transaction>("/api/v1/transactions/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: Record<string, unknown>, opts?: H) =>
    apiFetch<Transaction>("/api/v1/transactions/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/transactions/" + id, { method: "DELETE", ...opts }),

  monthlySummary: (params?: string, opts?: H) =>
    apiFetch<{
      income: number
      expense: number
      balance?: number
      by_category?: { category_name: string; total: number; count: number }[]
      by_member?: { member_name: string; amount: number }[]
    }>("/api/v1/transactions/monthly-summary" + (params ? "?" + params : ""), opts),
}
