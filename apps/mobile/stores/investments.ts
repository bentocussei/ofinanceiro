import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface Investment {
  id: string; name: string; type: string; institution: string | null
  invested_amount: number; current_value: number; interest_rate: number | null; is_active: boolean; return_pct: number
}

interface InvestmentsState {
  investments: Investment[]; isLoading: boolean
  fetchInvestments: (silent?: boolean) => Promise<void>
  createInvestment: (data: Record<string, unknown>) => Promise<Investment>
  updateInvestment: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteInvestment: (id: string) => Promise<void>
}

export const useInvestmentsStore = create<InvestmentsState>((set) => ({
  investments: [], isLoading: false,
  fetchInvestments: async (silent = false) => {
    if (!silent) set({ isLoading: true })
    try { const res = await apiFetch<{ items: Investment[] }>('/api/v1/investments/'); set({ investments: res.items, ...(!silent && { isLoading: false }) }) }
    catch { if (!silent) set({ isLoading: false }) }
  },
  createInvestment: async (data) => {
    const inv = await apiFetch<Investment>('/api/v1/investments/', { method: 'POST', body: JSON.stringify(data) })
    set((s) => ({ investments: [inv, ...s.investments] })); return inv
  },
  updateInvestment: async (id, data) => {
    await apiFetch(`/api/v1/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    const res = await apiFetch<{ items: Investment[] }>('/api/v1/investments/')
    set({ investments: res.items })
  },

  deleteInvestment: async (id) => {
    await apiFetch(`/api/v1/investments/${id}`, { method: 'DELETE' })
    set((s) => ({ investments: s.investments.filter((i) => i.id !== id) }))
  },
}))
