import { apiFetch } from "./client"

export interface Category {
  id: string
  name: string
  icon: string | null
  type: string
  parent_id: string | null
}

type H = { headers?: Record<string, string> }

export const categoriesApi = {
  list: (opts?: H) =>
    apiFetch<Category[]>("/api/v1/categories/", opts),
}
