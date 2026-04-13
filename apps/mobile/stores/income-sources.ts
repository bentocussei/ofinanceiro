import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface IncomeSource {
  id: string
  type: string
  name: string
  expected_amount: number
  frequency: string
  day_of_month: number | null
  is_active: boolean
  created_at: string
  description?: string | null
}

interface IncomeSourcesState {
  sources: IncomeSource[]
  isLoading: boolean
  fetchSources: () => Promise<void>
  createSource: (data: Record<string, unknown>) => Promise<IncomeSource>
  updateSource: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteSource: (id: string) => Promise<void>
}

export const useIncomeSourcesStore = create<IncomeSourcesState>((set) => ({
  sources: [],
  isLoading: false,

  fetchSources: async () => {
    set({ isLoading: true })
    try {
      const res = await apiFetch<{ items: IncomeSource[] }>('/api/v1/income-sources/')
      set({ sources: res.items, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  createSource: async (data) => {
    const source = await apiFetch<IncomeSource>('/api/v1/income-sources/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((state) => ({ sources: [source, ...state.sources] }))
    return source
  },

  updateSource: async (id, data) => {
    await apiFetch(`/api/v1/income-sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    const res = await apiFetch<{ items: IncomeSource[] }>('/api/v1/income-sources/')
    set({ sources: res.items })
  },

  deleteSource: async (id) => {
    await apiFetch(`/api/v1/income-sources/${id}`, { method: 'DELETE' })
    set((state) => ({ sources: state.sources.filter((s) => s.id !== id) }))
  },
}))
