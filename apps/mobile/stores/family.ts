import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface FamilyMember {
  id: string
  user_id: string
  role: 'admin' | 'adult' | 'dependent'
  display_name: string | null
  is_active: boolean
}

export interface Family {
  id: string
  name: string
  admin_user_id: string
  contribution_model: Record<string, unknown>
  invite_code: string | null
  members: FamilyMember[]
}

interface FamilyState {
  family: Family | null
  isLoading: boolean
  fetchFamily: () => Promise<void>
  createFamily: (name: string) => Promise<Family>
  joinFamily: (code: string) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  updateMemberRole: (memberId: string, role: string) => Promise<void>
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  isLoading: false,

  fetchFamily: async () => {
    set({ isLoading: true })
    try {
      const family = await apiFetch<Family | null>('/api/v1/families/me')
      set({ family, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  createFamily: async (name) => {
    const family = await apiFetch<Family>('/api/v1/families/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    set({ family })
    return family
  },

  joinFamily: async (code) => {
    await apiFetch('/api/v1/families/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: code }),
    })
    await get().fetchFamily()
  },

  removeMember: async (memberId) => {
    await apiFetch(`/api/v1/families/members/${memberId}`, { method: 'DELETE' })
    await get().fetchFamily()
  },

  updateMemberRole: async (memberId, role) => {
    await apiFetch(`/api/v1/families/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
    await get().fetchFamily()
  },
}))
