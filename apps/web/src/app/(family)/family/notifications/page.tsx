"use client"

import { Bell, Check, CheckCheck } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { notificationsApi, type Notification } from "@/lib/api/notifications"
import { getContextHeader } from "@/lib/context"

export default function FamilyNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = () => {
    const ctx = { headers: getContextHeader() }
    notificationsApi.list(ctx).then(setNotifications).catch(() => {})
  }

  useEffect(() => { fetchNotifications() }, [])

  const markRead = async (id: string) => {
    const ctx = { headers: getContextHeader() }
    await notificationsApi.markRead(id, ctx).catch(() => {})
    fetchNotifications()
  }

  const markAllRead = async () => {
    const ctx = { headers: getContextHeader() }
    await notificationsApi.markAllRead(ctx).catch(() => {})
    fetchNotifications()
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Notificações Familiares</h2>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" /> Marcar tudo como lido
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl bg-card p-12 shadow-sm flex flex-col items-center text-center">
          <Bell className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Sem notificações familiares</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-accent/50 ${!n.is_read ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
              onClick={() => { if (!n.is_read) markRead(n.id) }}
            >
              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.is_read ? "bg-blue-500" : "bg-transparent"}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.created_at ? new Date(n.created_at).toLocaleDateString("pt-AO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
              {!n.is_read && (
                <button onClick={(e) => { e.stopPropagation(); markRead(n.id) }} className="text-xs text-blue-500 hover:text-blue-600 flex-shrink-0">
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
