import { apiFetch } from "./client"

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
}

type H = { headers?: Record<string, string> }

interface PaginatedResponse<T> {
  items: T[]
  cursor: string | null
  has_more: boolean
}

export const notificationsApi = {
  list: (opts?: H) =>
    apiFetch<PaginatedResponse<Notification>>("/api/v1/notifications/", opts)
      .then(r => r.items),

  listPage: (params?: string, opts?: H) =>
    apiFetch<PaginatedResponse<Notification>>(
      "/api/v1/notifications/" + (params ? "?" + params : ""), opts
    ),

  unreadCount: (opts?: H) =>
    apiFetch<{ count: number }>("/api/v1/notifications/unread-count", opts),

  markRead: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/notifications/" + id + "/read", {
      method: "PUT",
      ...opts,
    }),

  markAllRead: (opts?: H) =>
    apiFetch<void>("/api/v1/notifications/read-all", {
      method: "PUT",
      ...opts,
    }),
}
