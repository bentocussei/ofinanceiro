"use client"

import { Bell, Check, CheckCheck } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { notificationsApi, type Notification } from "@/lib/api/notifications"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchNotifications = (loadMore = false) => {
    const params = loadMore && cursor ? `cursor=${cursor}` : ""
    notificationsApi.listPage(params)
      .then((res) => {
        if (loadMore) {
          setNotifications(prev => [...prev, ...res.items])
        } else {
          setNotifications(res.items)
        }
        setCursor(res.cursor)
        setHasMore(res.has_more)
      })
      .catch(() => {})
  }

  useEffect(() => { fetchNotifications() }, [])

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {})
    setCursor(null)
    setHasMore(false)
    fetchNotifications()
  }

  const markAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {})
    setCursor(null)
    setHasMore(false)
    fetchNotifications()
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Notificações</h2>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" /> Marcar tudo como lido
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Sem notificações</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 flex items-start gap-3 ${!n.is_read ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
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
                <button onClick={() => markRead(n.id)} className="text-xs text-blue-500 hover:text-blue-600 flex-shrink-0">
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" size="sm" onClick={() => fetchNotifications(true)}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  )
}
