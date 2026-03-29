import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface Notification { id: string; type: string; title: string; body: string; is_read: boolean; created_at: string }

interface NotificationsState {
  notifications: Notification[]; unreadCount: number; isLoading: boolean
  fetchNotifications: () => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [], unreadCount: 0, isLoading: false,
  fetchNotifications: async () => {
    set({ isLoading: true })
    try { const notifications = await apiFetch<Notification[]>('/api/v1/notifications/'); set({ notifications, isLoading: false }) }
    catch { set({ isLoading: false }) }
  },
  fetchUnreadCount: async () => {
    try { const data = await apiFetch<{ count: number }>('/api/v1/notifications/unread-count'); set({ unreadCount: data.count }) }
    catch {}
  },
  markRead: async (id) => {
    await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'PUT' })
    await get().fetchNotifications(); await get().fetchUnreadCount()
  },
  markAllRead: async () => {
    await apiFetch('/api/v1/notifications/read-all', { method: 'PUT' })
    await get().fetchNotifications(); set({ unreadCount: 0 })
  },
}))
