import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'

interface Subscription {
  plan_name: string
  status: string
  trial_end_date?: string
  end_date?: string
}

export default function SubscriptionScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Subscription>('/api/v1/billing/subscription')
      .then(setSub)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const bg = isDark ? '#000' : '#f5f5f5'
  const card = isDark ? '#1a1a1a' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#e5e5e5'

  const statusLabels: Record<string, string> = {
    active: 'Activo',
    trialing: 'Periodo de teste',
    expired: 'Expirado',
    cancelled: 'Cancelado',
  }

  const statusColors: Record<string, string> = {
    active: '#22c55e',
    trialing: '#3b82f6',
    expired: '#ef4444',
    cancelled: '#888',
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={text} />
          </Pressable>
          <Text style={[styles.title, { color: text }]}>Subscricao</Text>
        </View>

        {loading ? (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.loadingText, { color: muted }]}>A carregar...</Text>
          </View>
        ) : sub ? (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.planRow}>
              <Ionicons name="diamond" size={24} color={statusColors[sub.status] || muted} />
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: text }]}>{sub.plan_name}</Text>
                <Text style={[styles.planStatus, { color: statusColors[sub.status] || muted }]}>
                  {statusLabels[sub.status] || sub.status}
                </Text>
              </View>
            </View>

            {sub.trial_end_date && (
              <View style={[styles.infoRow, { borderTopColor: border }]}>
                <Text style={[styles.infoLabel, { color: muted }]}>Teste termina em</Text>
                <Text style={[styles.infoValue, { color: text }]}>
                  {new Date(sub.trial_end_date).toLocaleDateString('pt-AO')}
                </Text>
              </View>
            )}

            {sub.end_date && (
              <View style={[styles.infoRow, { borderTopColor: border }]}>
                <Text style={[styles.infoLabel, { color: muted }]}>Valido ate</Text>
                <Text style={[styles.infoValue, { color: text }]}>
                  {new Date(sub.end_date).toLocaleDateString('pt-AO')}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="diamond-outline" size={40} color={muted} style={styles.emptyIcon} />
            <Text style={[styles.emptyText, { color: muted }]}>
              Nenhuma subscricao activa
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 20 },
  loadingText: { textAlign: 'center', fontSize: 14 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planInfo: { flex: 1 },
  planName: { fontSize: 18, fontWeight: '700' },
  planStatus: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 0.5,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  emptyIcon: { alignSelf: 'center', marginBottom: 12 },
  emptyText: { textAlign: 'center', fontSize: 14 },
})
