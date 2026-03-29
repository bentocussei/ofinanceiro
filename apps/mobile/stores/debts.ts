import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface Debt {
  id: string; name: string; type: string; creditor: string | null
  original_amount: number; current_balance: number; interest_rate: number | null
  monthly_payment: number | null; payment_day: number | null; is_active: boolean
}

interface DebtsState {
  debts: Debt[]; isLoading: boolean
  fetchDebts: () => Promise<void>
  createDebt: (data: Record<string, unknown>) => Promise<Debt>
  registerPayment: (debtId: string, amount: number, date: string) => Promise<void>
  deleteDebt: (id: string) => Promise<void>
}

export const useDebtsStore = create<DebtsState>((set, get) => ({
  debts: [], isLoading: false,
  fetchDebts: async () => {
    set({ isLoading: true })
    try { const debts = await apiFetch<Debt[]>('/api/v1/debts/'); set({ debts, isLoading: false }) }
    catch { set({ isLoading: false }) }
  },
  createDebt: async (data) => {
    const debt = await apiFetch<Debt>('/api/v1/debts/', { method: 'POST', body: JSON.stringify(data) })
    set((s) => ({ debts: [debt, ...s.debts] })); return debt
  },
  registerPayment: async (debtId, amount, date) => {
    await apiFetch(`/api/v1/debts/${debtId}/payment`, { method: 'POST', body: JSON.stringify({ amount, payment_date: date }) })
    await get().fetchDebts()
  },
  deleteDebt: async (id) => {
    await apiFetch(`/api/v1/debts/${id}`, { method: 'DELETE' })
    set((s) => ({ debts: s.debts.filter((d) => d.id !== id) }))
  },
}))
