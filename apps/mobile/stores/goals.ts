import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface Goal {
  id: string
  name: string
  type: string
  icon: string | null
  target_amount: number
  current_amount: number
  target_date: string | null
  monthly_contribution: number | null
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  created_at: string
}

export interface GoalProgress {
  goal_id: string
  name: string
  target_amount: number
  current_amount: number
  remaining: number
  percentage: number
  monthly_contribution: number | null
  months_remaining: number | null
  projected_completion: string | null
  contributions: { id: string; amount: number; note: string | null; contributed_at: string }[]
}

interface GoalsState {
  goals: Goal[]
  isLoading: boolean
  fetchGoals: (silent?: boolean) => Promise<void>
  createGoal: (data: Record<string, unknown>) => Promise<Goal>
  contribute: (goalId: string, amount: number, note?: string) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  getProgress: (id: string) => Promise<GoalProgress>
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async (silent = false) => {
    if (!silent) set({ isLoading: true })
    try {
      const res = await apiFetch<{ items: Goal[] }>('/api/v1/goals/')
      set({ goals: res.items, ...(!silent && { isLoading: false }) })
    } catch {
      if (!silent) set({ isLoading: false })
    }
  },

  createGoal: async (data) => {
    const goal = await apiFetch<Goal>('/api/v1/goals/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((state) => ({ goals: [goal, ...state.goals] }))
    return goal
  },

  contribute: async (goalId, amount, note) => {
    await apiFetch(`/api/v1/goals/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    })
    // Refresh goals to get updated current_amount
    const res = await apiFetch<{ items: Goal[] }>('/api/v1/goals/')
    set({ goals: res.items })
  },

  deleteGoal: async (id) => {
    await apiFetch(`/api/v1/goals/${id}`, { method: 'DELETE' })
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }))
  },

  getProgress: async (id) => {
    return apiFetch<GoalProgress>(`/api/v1/goals/${id}/progress`)
  },
}))
