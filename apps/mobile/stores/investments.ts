import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface Investment {
  id: string; name: string; type: string; institution: string | null
  invested_amount: number; current_value: number; interest_rate: number | null; is_active: boolean; return_pct: number
}

interface InvestmentsState {
  investments: Investment[]; isLoading: boolean
  fetchInvestments: () => Promise<void>
  createInvestment: (data: Record<string, unknown>) => Promise<Investment>
  deleteInvestment: (id: string) => Promise<void>
}

export const useInvestmentsStore = create<InvestmentsState>((set) => ({
  investments: [], isLoading: false,
  fetchInvestments: async () => {
    set({ isLoading: true })
    try { const investments = await apiFetch<Investment[]>('/api/v1/investments/'); set({ investments, isLoading: false }) }
    catch { set({ isLoading: false }) }
  },
  createInvestment: async (data) => {
    const inv = await apiFetch<Investment>('/api/v1/investments/', { method: 'POST', body: JSON.stringify(data) })
    set((s) => ({ investments: [inv, ...s.investments] })); return inv
  },
  deleteInvestment: async (id) => {
    await apiFetch(`/api/v1/investments/${id}`, { method: 'DELETE' })
    set((s) => ({ investments: s.investments.filter((i) => i.id !== id) }))
  },
}))
