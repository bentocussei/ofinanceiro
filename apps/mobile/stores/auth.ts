import { create } from 'zustand'

import { apiFetch, clearTokens, getTokens, setTokens } from '../lib/api'

interface User {
  id: string
  name: string
  phone: string
  email?: string
  country?: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  isCheckingAuth: boolean
  user: User | null

  // Auth actions
  checkAuth: () => Promise<void>
  login: (phone: string, password: string) => Promise<void>
  register: (data: {
    phone: string
    name: string
    password?: string
    country?: string
    email?: string
    promoCode?: string
    referralCode?: string
  }) => Promise<string>
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (phone: string, otp: string) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  user: null,

  checkAuth: async () => {
    try {
      const { access } = await getTokens()
      if (access) {
        set({ isAuthenticated: true, isCheckingAuth: false })
        // Fetch user profile in background
        get().fetchUser().catch(() => {})
      } else {
        set({ isAuthenticated: false, isCheckingAuth: false })
      }
    } catch {
      set({ isAuthenticated: false, isCheckingAuth: false })
    }
  },

  login: async (phone, password) => {
    set({ isLoading: true })
    try {
      const data = await apiFetch<{ access_token: string; refresh_token: string }>(
        '/api/v1/auth/login',
        { method: 'POST', body: JSON.stringify({ phone, password }) }
      )
      await setTokens(data.access_token, data.refresh_token)
      set({ isAuthenticated: true, isLoading: false })
      get().fetchUser().catch(() => {})
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      const body: Record<string, string> = {
        phone: data.phone,
        name: data.name,
        country: data.country || 'AO',
      }
      if (data.password) body.password = data.password
      if (data.email) body.email = data.email
      if (data.promoCode) body.promo_code = data.promoCode
      if (data.referralCode) body.referral_code = data.referralCode

      const res = await apiFetch<{ message: string }>(
        '/api/v1/auth/register',
        { method: 'POST', body: JSON.stringify(body) }
      )
      set({ isLoading: false })
      return res.message
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  sendOtp: async (phone) => {
    await apiFetch('/api/v1/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  },

  verifyOtp: async (phone, otp) => {
    set({ isLoading: true })
    try {
      const data = await apiFetch<{ access_token: string; refresh_token: string }>(
        '/api/v1/auth/otp/verify',
        { method: 'POST', body: JSON.stringify({ phone, otp }) }
      )
      await setTokens(data.access_token, data.refresh_token)
      set({ isAuthenticated: true, isLoading: false })
      get().fetchUser().catch(() => {})
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    await clearTokens()
    set({ isAuthenticated: false, user: null })
  },

  fetchUser: async () => {
    try {
      const user = await apiFetch<User>('/api/v1/users/me')
      set({ user })
    } catch {
      // Silently fail — user profile is optional for core functionality
    }
  },
}))
