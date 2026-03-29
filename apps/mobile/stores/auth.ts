import { create } from 'zustand'

import { apiFetch, clearTokens, setTokens } from '../lib/api'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: { id: string; name: string; phone: string } | null
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, name: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setAuthenticated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,

  login: async (phone, password) => {
    set({ isLoading: true })
    try {
      const data = await apiFetch<{ access_token: string; refresh_token: string }>(
        '/api/v1/auth/login',
        { method: 'POST', body: JSON.stringify({ phone, password }) }
      )
      await setTokens(data.access_token, data.refresh_token)
      set({ isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (phone, name, password) => {
    set({ isLoading: true })
    try {
      const data = await apiFetch<{ access_token: string; refresh_token: string }>(
        '/api/v1/auth/register',
        { method: 'POST', body: JSON.stringify({ phone, name, password }) }
      )
      await setTokens(data.access_token, data.refresh_token)
      set({ isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    await clearTokens()
    set({ isAuthenticated: false, user: null })
  },

  setAuthenticated: (value) => set({ isAuthenticated: value }),
}))
