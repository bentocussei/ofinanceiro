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
  description?: string | null
  category?: string | null
  category_id?: string | null
  payment_account_id?: string | null
  pay_from_account_id?: string | null
  auto_pay?: boolean
  reminder_days?: number | null
}

interface BillsState {
  bills: Bill[]
  isLoading: boolean
  fetchBills: () => Promise<void>
  createBill: (data: Record<string, unknown>) => Promise<Bill>
  updateBill: (id: string, data: Record<string, unknown>) => Promise<void>
  payBill: (id: string) => Promise<void>
  deleteBill: (id: string) => Promise<void>
}

export const useBillsStore = create<BillsState>((set, get) => ({
  bills: [],
  isLoading: false,

  fetchBills: async () => {
    set({ isLoading: true })
    try {
      const res = await apiFetch<{ items: Bill[] }>('/api/v1/bills/')
      set({ bills: res.items, isLoading: false })
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

  updateBill: async (id, data) => {
    await apiFetch(`/api/v1/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    await get().fetchBills()
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
