import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface Tip { id: string; title: string; content: string }
export interface Challenge {
  id: string
  title: string
  description: string
  xp: number
  xp_reward: number
  target: number
  progress: number
  status: 'active' | 'completed'
}
export interface Badge { id: string; name: string }
export interface EduProfile {
  xp: number
  level: number
  streak_days: number
  badges: Badge[]
  next_level_xp: number
  xp_to_next_level: number
}

interface EducationState {
  tip: Tip | null; challenges: Challenge[]; profile: EduProfile | null; isLoading: boolean
  fetchAll: () => Promise<void>
}

export const useEducationStore = create<EducationState>((set) => ({
  tip: null, challenges: [], profile: null, isLoading: false,
  fetchAll: async () => {
    set({ isLoading: true })
    try {
      const [tip, challenges, profile] = await Promise.all([
        apiFetch<Tip>('/api/v1/education/daily-tip'),
        apiFetch<Challenge[]>('/api/v1/education/challenges'),
        apiFetch<EduProfile>('/api/v1/education/profile'),
      ])
      set({ tip, challenges, profile, isLoading: false })
    } catch { set({ isLoading: false }) }
  },
}))
