import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface RecurringRule {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  frequency: string
  next_due_date: string | null
  is_active: boolean
  created_at: string
}

interface RecurringRulesState {
  rules: RecurringRule[]
  isLoading: boolean
  fetchRules: (silent?: boolean) => Promise<void>
  createRule: (data: Record<string, unknown>) => Promise<RecurringRule>
  updateRule: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteRule: (id: string) => Promise<void>
}

export const useRecurringRulesStore = create<RecurringRulesState>((set) => ({
  rules: [],
  isLoading: false,

  fetchRules: async (silent = false) => {
    if (!silent) set({ isLoading: true })
    try {
      const res = await apiFetch<{ items: RecurringRule[] }>('/api/v1/recurring-rules/')
      set({ rules: res.items, ...(!silent && { isLoading: false }) })
    } catch {
      if (!silent) set({ isLoading: false })
    }
  },

  createRule: async (data) => {
    const rule = await apiFetch<RecurringRule>('/api/v1/recurring-rules/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((state) => ({ rules: [rule, ...state.rules] }))
    return rule
  },

  updateRule: async (id, data) => {
    await apiFetch(`/api/v1/recurring-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    const res = await apiFetch<{ items: RecurringRule[] }>('/api/v1/recurring-rules/')
    set({ rules: res.items })
  },

  deleteRule: async (id) => {
    await apiFetch(`/api/v1/recurring-rules/${id}`, { method: 'DELETE' })
    set((state) => ({ rules: state.rules.filter((r) => r.id !== id) }))
  },
}))
