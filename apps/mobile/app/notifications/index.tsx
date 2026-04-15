import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, themeColors } from '../../lib/tokens'
import { Notification, useNotificationsStore } from '../../stores/notifications'

export default function NotificationsScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { notifications, unreadCount, isLoading, fetchNotifications, markRead, markAllRead } =
    useNotificationsStore()

  useEffect(() => { fetchNotifications() }, [])
  const onRefresh = useCallback(() => fetchNotifications(), [])

  const handleTap = async (notification: Notification) => {
    if (!notification.is_read) {
      await markRead(notification.id)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Agora'
    if (diffMin < 60) return `${diffMin}m`
    if (diffHour < 24) return `${diffHour}h`
    if (diffDay < 7) return `${diffDay}d`
    return date.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' })
  }

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'budget_alert': return 'pie-chart-outline'
      case 'goal_reached': return 'flag-outline'
      case 'payment_due': return 'card-outline'
      case 'transaction': return 'swap-horizontal-outline'
      case 'tip': return 'bulb-outline'
      default: return 'notifications-outline'
    }
  }

  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable
      style={[
        styles.notifCard,
        { backgroundColor: tc.card },
        !item.is_read && styles.unreadCard,
        !item.is_read && isDark && styles.unreadCardDark,
      ]}
      onPress={() => handleTap(item)}
    >
      <View style={styles.notifRow}>
        <View style={styles.iconCol}>
          <Ionicons
            name={getNotificationIcon(item.type) as any}
            size={22}
            color={item.is_read ? tc.textMuted : colors.primary}
          />
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.notifContent}>
          <Text
            style={[
              styles.notifTitle,
              { color: tc.text },
              item.is_read && { color: tc.textSecondary },
            ]}
          >
            {item.title}
          </Text>
          <Text style={[styles.notifBody, { color: tc.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        <Text style={[styles.notifTime, { color: tc.textMuted }]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    </Pressable>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, { color: tc.text }]}>Notificações</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markAllText}>Marcar tudo</Text>
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={tc.handle} />
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>
              Nenhuma notificação
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  markAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  list: { padding: 16, gap: 8 },
  notifCard: { borderRadius: 14, padding: 14 },
  unreadCard: { backgroundColor: colors.primaryLight },
  unreadCardDark: { backgroundColor: '#0f1d2e' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconCol: { position: 'relative', paddingTop: 2 },
  unreadDot: {
    position: 'absolute', top: 0, right: -2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  notifBody: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16 },
})
