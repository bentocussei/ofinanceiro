import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'

interface ExpenseSplit {
  id: string
  description: string
  total_amount: number
  split_type: string
  status: string
  created_by_name: string
  participants: { member_name: string; amount: number; is_paid: boolean }[]
  created_at: string
}

export default function ExpenseSplitsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [loading, setLoading] = useState(true)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border

  const fetchSplits = useCallback(async () => {
    try {
      const data = await apiFetch<ExpenseSplit[]>('/api/v1/expense-splits/')
      setSplits(data)
    } catch {
      // May not exist yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSplits() }, [])

  const statusLabels: Record<string, string> = {
    pending: 'Pendente', settled: 'Liquidado', partial: 'Parcial',
  }
  const statusColors: Record<string, string> = {
    pending: colors.warning, settled: colors.success, partial: colors.primary,
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Divisao de despesas</Text>
      </View>

      <FlatList
        data={splits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSplits} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardName, { color: text }]}>{item.description}</Text>
                <Text style={[styles.cardAmount, { color: text }]}>{formatKz(item.total_amount)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: (statusColors[item.status] || '#888') + '20' }]}>
                <Text style={[styles.badgeText, { color: statusColors[item.status] || '#888' }]}>
                  {statusLabels[item.status] || item.status}
                </Text>
              </View>
            </View>

            <View style={[styles.participants, { borderTopColor: border }]}>
              {item.participants.map((p, i) => (
                <View key={i} style={styles.participantRow}>
                  <Ionicons
                    name={p.is_paid ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={p.is_paid ? colors.success : muted}
                  />
                  <Text style={[styles.participantName, { color: text }]}>{p.member_name}</Text>
                  <Text style={[styles.participantAmount, { color: muted }]}>{formatKz(p.amount)}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.createdBy, { color: muted }]}>
              Criado por {item.created_by_name}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={muted} />
              <Text style={[styles.emptyText, { color: muted }]}>Nenhuma despesa dividida</Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                Divide despesas com os membros da familia pelo assistente ou pela web.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardAmount: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  participants: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, gap: 8 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantName: { flex: 1, fontSize: 14 },
  participantAmount: { fontSize: 14, fontFamily: 'monospace' },
  createdBy: { fontSize: 11, marginTop: 10 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
