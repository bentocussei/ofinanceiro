import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  icon: string | null
  color: string | null
  institution: string | null
  is_archived: boolean
  is_shared: boolean
}

interface AccountSummary {
  total_assets: number
  total_liabilities: number
  net_worth: number
  currency: string
  accounts: Account[]
}

interface AccountsState {
  accounts: Account[]
  summary: AccountSummary | null
  isLoading: boolean
  fetchAccounts: () => Promise<void>
  fetchSummary: () => Promise<void>
  createAccount: (data: Record<string, unknown>) => Promise<Account>
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  summary: null,
  isLoading: false,

  fetchAccounts: async () => {
    set({ isLoading: true })
    try {
      const res = await apiFetch<{ items: Account[] }>('/api/v1/accounts/')
      set({ accounts: res.items, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchSummary: async () => {
    try {
      const summary = await apiFetch<AccountSummary>('/api/v1/accounts/summary')
      set({ summary, accounts: summary.accounts })
    } catch {
      // silent fail
    }
  },

  createAccount: async (data) => {
    const account = await apiFetch<Account>('/api/v1/accounts/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((state) => ({ accounts: [...state.accounts, account] }))
    return account
  },
}))
