import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import IconDisplay from '../../components/common/IconDisplay'
import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'

interface CategorySpending {
  category_name: string
  category_icon: string | null
  total: number
  count: number
}

interface Summary {
  income: number
  expense: number
  balance: number
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

type Period = 'month' | '3months' | 'year'

export default function ReportsScreen() {
  const isDark = useColorScheme() === 'dark'
  const [spending, setSpending] = useState<CategorySpending[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback((p: Period) => {
    setIsLoading(true)
    const now = new Date()
    const from = new Date()
    if (p === 'month') from.setMonth(now.getMonth() - 1)
    else if (p === '3months') from.setMonth(now.getMonth() - 3)
    else from.setFullYear(now.getFullYear() - 1)

    const dateFrom = from.toISOString().split('T')[0]
    const dateTo = now.toISOString().split('T')[0]

    Promise.all([
      apiFetch<CategorySpending[]>(`/api/v1/reports/spending-by-category?date_from=${dateFrom}&date_to=${dateTo}`),
      apiFetch<Summary>(`/api/v1/reports/income-expense-summary?date_from=${dateFrom}&date_to=${dateTo}`),
    ])
      .then(([sp, sum]) => {
        setSpending(sp)
        setSummary(sum)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period])

  const totalExpense = spending.reduce((s, c) => s + c.total, 0)

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchData(period)} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.textLight]}>Relatórios</Text>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {(['month', '3months', 'year'] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodChip, period === p && styles.periodActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'month' ? 'Este mês' : p === '3months' ? '3 meses' : 'Este ano'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary cards */}
        {summary && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, isDark && styles.cardDark]}>
              <Text style={[styles.summaryLabel, isDark && styles.textMuted]}>Receitas</Text>
              <Text style={[styles.summaryValue, styles.income]}>{formatKz(summary.income)}</Text>
            </View>
            <View style={[styles.summaryCard, isDark && styles.cardDark]}>
              <Text style={[styles.summaryLabel, isDark && styles.textMuted]}>Despesas</Text>
              <Text style={[styles.summaryValue, styles.expense]}>{formatKz(summary.expense)}</Text>
            </View>
          </View>
        )}

        {/* Balance */}
        {summary && (
          <View style={[styles.balanceCard, isDark && styles.cardDark]}>
            <Text style={[styles.summaryLabel, isDark && styles.textMuted]}>Balanço</Text>
            <Text style={[styles.balanceValue, summary.balance >= 0 ? styles.income : styles.expense]}>
              {formatKz(summary.balance)}
            </Text>
          </View>
        )}

        {/* Savings rate */}
        {summary && summary.income > 0 && (
          <View style={[styles.savingsCard, isDark && styles.cardDark]}>
            <Ionicons name="trending-up-outline" size={20} color={summary.balance >= 0 ? '#22c55e' : '#ef4444'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryLabel, isDark && styles.textMuted]}>Taxa de poupanca</Text>
              <Text style={[styles.savingsValue, { color: summary.balance >= 0 ? '#22c55e' : '#ef4444' }]}>
                {Math.round((summary.balance / summary.income) * 100)}%
              </Text>
            </View>
            <Text style={[styles.savingsHint, isDark && styles.textMuted]}>
              {summary.balance >= 0 ? 'Bom trabalho!' : 'Gastas mais do que ganhas'}
            </Text>
          </View>
        )}

        {/* Spending by category */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Gastos por categoria</Text>
        </View>

        {spending.length > 0 ? (
          <View style={[styles.categoryList, isDark && styles.cardDark]}>
            {spending.map((cat, i) => {
              const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0
              return (
                <View key={i} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.colorDot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                    <Text style={[styles.categoryName, isDark && styles.textLight]}>
                      <IconDisplay name={cat.category_name} size={14} color={isDark ? '#fff' : '#000'} /> {cat.category_name}
                    </Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <View style={styles.barContainer}>
                      <View style={[styles.bar, { width: `${Math.max(pct, 2)}%`, backgroundColor: COLORS[i % COLORS.length] }]} />
                    </View>
                    <Text style={[styles.categoryAmount, isDark && styles.textLight]}>
                      {formatKz(cat.total)}
                    </Text>
                    <Text style={[styles.categoryPct, isDark && styles.textMuted]}>
                      {Math.round(pct)}%
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={isDark ? '#444' : '#ddd'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>
              Registe transacções para ver os relatórios
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  periodChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fff',
  },
  periodActive: { backgroundColor: '#000', borderColor: '#000' },
  periodText: { fontSize: 13, color: '#666' },
  periodTextActive: { color: '#fff', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
  },
  cardDark: { backgroundColor: '#1a1a1a' },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace' },
  balanceCard: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
  },
  balanceValue: { fontSize: 24, fontWeight: '700', fontFamily: 'monospace' },
  income: { color: '#22c55e' },
  expense: { color: '#ef4444' },
  savingsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
  },
  savingsValue: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace' },
  savingsHint: { fontSize: 12 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  categoryList: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  categoryRow: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 14, color: '#000' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18 },
  barContainer: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 },
  bar: { height: 6, borderRadius: 3 },
  categoryAmount: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600', color: '#000', minWidth: 80, textAlign: 'right' },
  categoryPct: { fontSize: 11, color: '#999', minWidth: 30, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
