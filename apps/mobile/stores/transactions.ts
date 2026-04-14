import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface Transaction {
  id: string
  account_id: string
  category_id: string | null
  amount: number
  type: 'income' | 'expense' | 'transfer'
  description: string | null
  merchant: string | null
  tags: string[]
  is_recurring: boolean
  needs_review: boolean
  is_private: boolean
  transaction_date: string
  created_at: string
}

interface TransactionsState {
  transactions: Transaction[]
  cursor: string | null
  hasMore: boolean
  isLoading: boolean
  fetchTransactions: (reset?: boolean, silent?: boolean) => Promise<void>
  createTransaction: (data: Record<string, unknown>) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  cursor: null,
  hasMore: true,
  isLoading: false,

  fetchTransactions: async (reset = false, silent = false) => {
    const state = get()
    if (state.isLoading) return
    if (!reset && !state.hasMore) return

    if (!silent) set({ isLoading: true })
    const cursor = reset ? '' : state.cursor ? `&cursor=${state.cursor}` : ''
    try {
      const data = await apiFetch<{
        items: Transaction[]
        cursor: string | null
        has_more: boolean
      }>(`/api/v1/transactions/?limit=30${cursor}`)

      set({
        transactions: reset ? data.items : [...state.transactions, ...data.items],
        cursor: data.cursor,
        hasMore: data.has_more,
        ...(!silent && { isLoading: false }),
      })
    } catch {
      if (!silent) set({ isLoading: false })
    }
  },

  createTransaction: async (data) => {
    const txn = await apiFetch<Transaction>('/api/v1/transactions/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((state) => ({ transactions: [txn, ...state.transactions] }))
    return txn
  },

  deleteTransaction: async (id) => {
    await apiFetch(`/api/v1/transactions/${id}`, { method: 'DELETE' })
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }))
  },
}))
