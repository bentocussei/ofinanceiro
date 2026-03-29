import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface Bill {
  id: string
  name: string
  amount: number
  due_day: number
  frequency: string
  status: 'pending' | 'paid' | 'overdue'
  is_active: boolean
  paid_at: string | null
  created_at: string
}

interface BillsState {
  bills: Bill[]
  isLoading: boolean
  fetchBills: () => Promise<void>
  createBill: (data: Record<string, unknown>) => Promise<Bill>
  payBill: (id: string) => Promise<void>
  deleteBill: (id: string) => Promise<void>
}

export const useBillsStore = create<BillsState>((set, get) => ({
  bills: [],
  isLoading: false,

  fetchBills: async () => {
    set({ isLoading: true })
    try {
      const bills = await apiFetch<Bill[]>('/api/v1/bills/')
      set({ bills, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  createBill: async (data) => {
    const bill = await apiFetch<Bill>('/api/v1/bills/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((state) => ({ bills: [bill, ...state.bills] }))
    return bill
  },

  payBill: async (id) => {
    await apiFetch(`/api/v1/bills/${id}/pay`, { method: 'POST' })
    await get().fetchBills()
  },

  deleteBill: async (id) => {
    await apiFetch(`/api/v1/bills/${id}`, { method: 'DELETE' })
    set((state) => ({ bills: state.bills.filter((b) => b.id !== id) }))
  },
}))
