import { apiFetch } from "./client"

export interface SplitPart {
  id: string
  member_id: string
  member_name?: string
  amount: number
  percentage?: number
  is_paid: boolean
  paid_at?: string | null
  is_settled?: boolean
}

export interface ExpenseSplit {
  id: string
  family_id: string
  transaction_id?: string | null
  description: string
  total_amount: number
  split_type?: string
  status?: string
  is_settled: boolean
  settled_at?: string | null
  notes?: string | null
  parts: SplitPart[]
  items?: SplitPart[]
  created_at: string
  updated_at?: string
}

export interface CreateSplitData {
  description: string
  total_amount: number
  split_type?: string
  parts?: { member_id: string; amount?: number; percentage?: number }[]
}

type H = { headers?: Record<string, string> }

export const expenseSplitsApi = {
  list: (opts?: H) =>
    apiFetch<ExpenseSplit[]>("/api/v1/expense-splits/", opts),

  create: (data: CreateSplitData, opts?: H) =>
    apiFetch<ExpenseSplit>("/api/v1/expense-splits/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  settlePart: (splitId: string, partId: string, opts?: H) =>
    apiFetch<ExpenseSplit>(
      "/api/v1/expense-splits/" + splitId + "/parts/" + partId + "/settle",
      { method: "PUT", ...opts },
    ),

  settle: (splitId: string, opts?: H) =>
    apiFetch<ExpenseSplit>(
      "/api/v1/expense-splits/" + splitId + "/settle",
      { method: "PUT", ...opts },
    ),

  remove: (splitId: string, opts?: H) =>
    apiFetch<void>("/api/v1/expense-splits/" + splitId, {
      method: "DELETE",
      ...opts,
    }),
}
