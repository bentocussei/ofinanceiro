import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface BudgetItem {
  id: string
  budget_id: string
  category_id: string
  limit_amount: number
  rollover_amount: number
}

export interface Budget {
  id: string
  name: string | null
  method: string
  period_type: string
  period_start: string
  period_end: string
  total_limit: number | null
  rollover: boolean
  is_active: boolean
  items: BudgetItem[]
  created_at: string
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
  method: string
  period_start: string
  period_end: string
  days_remaining: number
  total_limit: number | null
  total_spent: number
  total_remaining: number
  percentage: number
  items: BudgetItemStatus[]
}

interface BudgetsState {
  budgets: Budget[]
  isLoading: boolean
  fetchBudgets: () => Promise<void>
  getBudgetStatus: (id: string) => Promise<BudgetStatus>
  createBudget: (data: {
    name?: string
    method?: string
    period_start: string
    period_end: string
    total_limit?: number
    items?: { category_id: string; limit_amount: number }[]
  }) => Promise<Budget>
  deleteBudget: (id: string) => Promise<void>
}

export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  budgets: [],
  isLoading: false,

  fetchBudgets: async () => {
    set({ isLoading: true })
    try {
      const res = await apiFetch<{ items: Budget[] }>('/api/v1/budgets/')
      set({ budgets: res.items, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  getBudgetStatus: async (id: string) => {
    return apiFetch<BudgetStatus>(`/api/v1/budgets/${id}/status`)
  },

  createBudget: async (data) => {
    const budget = await apiFetch<Budget>('/api/v1/budgets/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((state) => ({ budgets: [budget, ...state.budgets] }))
    return budget
  },

  deleteBudget: async (id) => {
    await apiFetch(`/api/v1/budgets/${id}`, { method: 'DELETE' })
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }))
  },
}))
