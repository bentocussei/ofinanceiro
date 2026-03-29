import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect } from 'react'
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

import { formatKz } from '../../lib/format'
import { Investment, useInvestmentsStore } from '../../stores/investments'

export default function InvestmentsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { investments, isLoading, fetchInvestments, deleteInvestment } = useInvestmentsStore()

  useEffect(() => { fetchInvestments() }, [])
  const onRefresh = useCallback(() => fetchInvestments(), [])

  const handleDelete = (inv: Investment) => {
    Alert.alert('Eliminar', `Eliminar investimento "${inv.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteInvestment(inv.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const renderInvestment = ({ item }: { item: Investment }) => {
    const returnAmount = item.current_value - item.invested_amount
    const returnPct = item.invested_amount > 0
      ? ((returnAmount / item.invested_amount) * 100).toFixed(1)
      : '0.0'
    const isPositive = returnAmount >= 0

    return (
      <Pressable
        style={[styles.card, isDark && styles.cardDark]}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="trending-up-outline" size={22} color={isDark ? '#fff' : '#000'} />
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, isDark && styles.textLight]}>{item.name}</Text>
            {item.institution && (
              <Text style={[styles.institution, isDark && styles.textMuted]}>{item.institution}</Text>
            )}
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, isDark && styles.textMuted]}>Investido</Text>
            <Text style={[styles.detailValue, isDark && styles.textLight]}>
              {formatKz(item.invested_amount)}
            </Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, isDark && styles.textMuted]}>Actual</Text>
            <Text style={[styles.detailValue, isDark && styles.textLight]}>
              {formatKz(item.current_value)}
            </Text>
          </View>
        </View>

        <View style={styles.returnRow}>
          <Ionicons
            name={isPositive ? 'arrow-up' : 'arrow-down'}
            size={14}
            color={isPositive ? '#22c55e' : '#ef4444'}
          />
          <Text style={[styles.returnText, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
            {formatKz(Math.abs(returnAmount))} ({returnPct}%)
          </Text>
          {item.interest_rate != null && (
            <Text style={[styles.rateText, isDark && styles.textMuted]}>
              Taxa: {item.interest_rate}%
            </Text>
          )}
        </View>
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Investimentos</Text>
        <Pressable
          style={[styles.addBtn, isDark && styles.addBtnDark]}
          onPress={() => router.push('/investments/create')}
        >
          <Ionicons name="add" size={20} color="#3b82f6" />
        </Pressable>
      </View>

      <FlatList
        data={investments}
        keyExtractor={(item) => item.id}
        renderItem={renderInvestment}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trending-up-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhum investimento registado</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Acompanhe os seus investimentos e veja o retorno
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  addBtnDark: { backgroundColor: '#1e3a5f' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardDark: { backgroundColor: '#1a1a1a' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#000' },
  institution: { fontSize: 13, color: '#999', marginTop: 2 },
  detailsRow: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  detailCol: {},
  detailLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', fontFamily: 'monospace', color: '#000' },
  returnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  returnText: { fontSize: 13, fontWeight: '600' },
  rateText: { fontSize: 12, color: '#999', marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
