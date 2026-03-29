import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface Category {
  id: string
  parent_id: string | null
  name: string
  icon: string | null
  type: 'expense' | 'income' | 'both'
  is_system: boolean
  sort_order: number
}

interface CategoriesState {
  categories: Category[]
  isLoading: boolean
  fetchCategories: () => Promise<void>
  getParentCategories: (type?: 'expense' | 'income') => Category[]
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  isLoading: false,

  fetchCategories: async () => {
    if (get().categories.length > 0) return // Already loaded
    set({ isLoading: true })
    try {
      const categories = await apiFetch<Category[]>('/api/v1/categories/')
      set({ categories, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  getParentCategories: (type) => {
    const { categories } = get()
    return categories.filter((c) => {
      const isParent = c.parent_id === null
      if (!type) return isParent
      return isParent && (c.type === type || c.type === 'both')
    })
  },
}))
