import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { Budget, BudgetStatus, useBudgetsStore } from '../../stores/budgets'

export default function BudgetScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { budgets, isLoading, fetchBudgets, deleteBudget } = useBudgetsStore()
  const [statuses, setStatuses] = useState<Record<string, BudgetStatus>>({})

  useEffect(() => {
    fetchBudgets()
  }, [])

  useEffect(() => {
    // Load status for each budget
    budgets.forEach(async (b) => {
      try {
        const status = await apiFetch<BudgetStatus>(`/api/v1/budgets/${b.id}/status`)
        setStatuses((prev) => ({ ...prev, [b.id]: status }))
      } catch {}
    })
  }, [budgets])

  const onRefresh = useCallback(() => {
    fetchBudgets()
  }, [])

  const handleDelete = (budget: Budget) => {
    Alert.alert('Eliminar', `Eliminar orçamento "${budget.name || 'Sem nome'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(budget.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return '#ef4444'
    if (pct >= 90) return '#f97316'
    if (pct >= 70) return '#f59e0b'
    return '#22c55e'
  }

  const renderBudget = ({ item }: { item: Budget }) => {
    const status = statuses[item.id]

    return (
      <Pressable
        style={[styles.budgetCard, isDark && styles.cardDark]}
        onPress={() => router.push(`/budget/${item.id}`)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.budgetHeader}>
          <Text style={[styles.budgetName, isDark && styles.textLight]}>
            {item.name || 'Orçamento'}
          </Text>
          {status && (
            <Text style={[styles.daysLeft, isDark && styles.textMuted]}>
              {status.days_remaining}d restantes
            </Text>
          )}
        </View>

        {status && (
          <>
            {/* Total progress */}
            <View style={styles.totalRow}>
              <Text style={[styles.totalSpent, isDark && styles.textLight]}>
                {formatKz(status.total_spent)}
              </Text>
              <Text style={[styles.totalLimit, isDark && styles.textMuted]}>
                / {formatKz(status.total_limit || 0)}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(status.percentage, 100)}%`,
                    backgroundColor: getProgressColor(status.percentage),
                  },
                ]}
              />
            </View>
            <Text style={[styles.percentText, { color: getProgressColor(status.percentage) }]}>
              {status.percentage}% utilizado
            </Text>

            {/* Category items */}
            {status.items.slice(0, 3).map((cat) => (
              <View key={cat.category_id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, isDark && styles.textLight]}>
                    {cat.category_icon || '📦'} {cat.category_name}
                  </Text>
                  <Text style={[styles.itemValues, isDark && styles.textMuted]}>
                    {formatKz(cat.spent)} / {formatKz(cat.limit_amount)}
                  </Text>
                </View>
                <View style={styles.itemBarBg}>
                  <View
                    style={[
                      styles.itemBarFill,
                      {
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: getProgressColor(cat.percentage),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}

            {status.items.length > 3 && (
              <Text style={[styles.moreItems, isDark && styles.textMuted]}>
                +{status.items.length - 3} categorias
              </Text>
            )}
          </>
        )}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Orçamentos</Text>
        <Pressable
          style={[styles.addBtn, isDark && styles.addBtnDark]}
          onPress={() => router.push('/budget/create')}
        >
          <Ionicons name="add" size={20} color="#3b82f6" />
        </Pressable>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        renderItem={renderBudget}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>
              Nenhum orçamento criado
            </Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Crie um orçamento para controlar os seus gastos por categoria
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
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDark: { backgroundColor: '#1e3a5f' },
  list: { padding: 16, gap: 12 },
  budgetCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardDark: { backgroundColor: '#1a1a1a' },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetName: { fontSize: 16, fontWeight: '600', color: '#000' },
  daysLeft: { fontSize: 12, color: '#999' },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  totalSpent: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  totalLimit: { fontSize: 14, color: '#999', fontFamily: 'monospace', marginLeft: 4 },
  progressBarBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, marginBottom: 4 },
  progressBarFill: { height: 8, borderRadius: 4 },
  percentText: { fontSize: 12, fontWeight: '600', marginBottom: 12 },
  itemRow: { paddingVertical: 6 },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 13, color: '#000' },
  itemValues: { fontSize: 12, fontFamily: 'monospace', color: '#999' },
  itemBarBg: { height: 4, backgroundColor: '#f0f0f0', borderRadius: 2 },
  itemBarFill: { height: 4, borderRadius: 2 },
  moreItems: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
