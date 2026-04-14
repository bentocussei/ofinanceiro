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
  fetchAccounts: (silent?: boolean) => Promise<void>
  fetchSummary: (silent?: boolean) => Promise<void>
  createAccount: (data: Record<string, unknown>) => Promise<Account>
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  summary: null,
  isLoading: false,

  fetchAccounts: async (silent = false) => {
    if (!silent) set({ isLoading: true })
    try {
      const res = await apiFetch<{ items: Account[] }>('/api/v1/accounts/')
      set({ accounts: res.items, ...(!silent && { isLoading: false }) })
    } catch {
      if (!silent) set({ isLoading: false })
    }
  },

  fetchSummary: async (_silent: boolean = false) => {
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
