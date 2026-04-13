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
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg'

import IconDisplay from '../../components/common/IconDisplay'
import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'

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

const CHART_COLORS = ['#0D9488', '#D97706', '#2563EB', '#7C3AED', '#15803D', '#EA580C', '#DB2777', '#B91C1C']

type Period = 'month' | '3months' | 'year'

// ─── Bar Chart (Income vs Expense) ───────────────────────────────────
function BarChart({ income, expense, tc }: { income: number; expense: number; tc: ReturnType<typeof themeColors> }) {
  const maxVal = Math.max(income, expense, 1)
  const chartH = 120
  const barW = 60
  const gap = 40
  const totalW = barW * 2 + gap
  const startX = (300 - totalW) / 2

  const incomeH = (income / maxVal) * chartH
  const expenseH = (expense / maxVal) * chartH

  return (
    <View style={[styles.chartCard, { backgroundColor: tc.card }]}>
      <Text style={[styles.chartTitle, { color: tc.text }]}>Receitas vs Despesas</Text>
      <Svg width="100%" height={180} viewBox="0 0 300 180">
        {/* Income bar */}
        <Rect
          x={startX}
          y={chartH - incomeH + 10}
          width={barW}
          height={incomeH}
          rx={6}
          fill={colors.success}
        />
        <SvgText
          x={startX + barW / 2}
          y={chartH - incomeH + 4}
          fontSize={10}
          fontWeight="600"
          fill={tc.textSecondary}
          textAnchor="middle"
        >
          {formatKz(income)}
        </SvgText>
        <SvgText
          x={startX + barW / 2}
          y={chartH + 28}
          fontSize={12}
          fill={tc.textSecondary}
          textAnchor="middle"
        >
          Receitas
        </SvgText>

        {/* Expense bar */}
        <Rect
          x={startX + barW + gap}
          y={chartH - expenseH + 10}
          width={barW}
          height={expenseH}
          rx={6}
          fill={colors.error}
        />
        <SvgText
          x={startX + barW + gap + barW / 2}
          y={chartH - expenseH + 4}
          fontSize={10}
          fontWeight="600"
          fill={tc.textSecondary}
          textAnchor="middle"
        >
          {formatKz(expense)}
        </SvgText>
        <SvgText
          x={startX + barW + gap + barW / 2}
          y={chartH + 28}
          fontSize={12}
          fill={tc.textSecondary}
          textAnchor="middle"
        >
          Despesas
        </SvgText>
      </Svg>
    </View>
  )
}

// ─── Doughnut Chart (Spending by Category) ───────────────────────────
function DoughnutChart({
  data,
  total,
  tc,
}: {
  data: CategorySpending[]
  total: number
  tc: ReturnType<typeof themeColors>
}) {
  const cx = 90
  const cy = 90
  const outerR = 80
  const innerR = 50
  const size = 180

  // Build arc segments
  const segments: { path: string; color: string }[] = []
  let startAngle = -Math.PI / 2 // start at top

  data.forEach((cat, i) => {
    const pct = total > 0 ? cat.total / total : 0
    if (pct <= 0) return
    const sweep = pct * Math.PI * 2
    const endAngle = startAngle + sweep
    const largeArc = sweep > Math.PI ? 1 : 0

    const ox1 = cx + outerR * Math.cos(startAngle)
    const oy1 = cy + outerR * Math.sin(startAngle)
    const ox2 = cx + outerR * Math.cos(endAngle)
    const oy2 = cy + outerR * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)

    const d = [
      `M ${ox1} ${oy1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ')

    segments.push({ path: d, color: CHART_COLORS[i % CHART_COLORS.length] })
    startAngle = endAngle
  })

  // If only one category, draw a full ring
  if (data.length === 1 && total > 0) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={outerR} fill={CHART_COLORS[0]} />
        <Circle cx={cx} cy={cy} r={innerR} fill={tc.card} />
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {segments.map((seg, i) => (
          <Path key={i} d={seg.path} fill={seg.color} />
        ))}
      </G>
    </Svg>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────
export default function ReportsScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchData(period)} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: tc.text }]}>Relatórios</Text>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {(['month', '3months', 'year'] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[
                styles.periodChip,
                { borderColor: tc.border, backgroundColor: tc.card },
                period === p && styles.periodActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: tc.textSecondary },
                  period === p && styles.periodTextActive,
                ]}
              >
                {p === 'month' ? 'Este mês' : p === '3months' ? '3 meses' : 'Este ano'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 3 Summary cards in a row */}
        {summary && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: tc.card }]}>
              <Text style={[styles.summaryLabel, { color: tc.textSecondary }]}>Receitas</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatKz(summary.income)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: tc.card }]}>
              <Text style={[styles.summaryLabel, { color: tc.textSecondary }]}>Despesas</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatKz(summary.expense)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: tc.card }]}>
              <Text style={[styles.summaryLabel, { color: tc.textSecondary }]}>Balanço</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: summary.balance >= 0 ? colors.success : colors.error },
                ]}
              >
                {formatKz(summary.balance)}
              </Text>
            </View>
          </View>
        )}

        {/* Savings rate pill */}
        {summary && summary.income > 0 && (
          <View style={[styles.savingsCard, { backgroundColor: tc.card }]}>
            <Ionicons
              name="trending-up-outline"
              size={18}
              color={summary.balance >= 0 ? colors.success : colors.error}
            />
            <Text style={[styles.savingsLabel, { color: tc.textSecondary }]}>Taxa de poupança</Text>
            <Text
              style={[
                styles.savingsValue,
                { color: summary.balance >= 0 ? colors.success : colors.error },
              ]}
            >
              {Math.round((summary.balance / summary.income) * 100)}%
            </Text>
            <Text style={[styles.savingsHint, { color: tc.textMuted }]}>
              {summary.balance >= 0 ? 'Bom trabalho!' : 'Gastas mais do que ganhas'}
            </Text>
          </View>
        )}

        {/* Income vs Expense Bar Chart */}
        {summary && (summary.income > 0 || summary.expense > 0) && (
          <BarChart income={summary.income} expense={summary.expense} tc={tc} />
        )}

        {/* Spending by Category: Doughnut + Legend */}
        {spending.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: tc.card }]}>
            <Text style={[styles.chartTitle, { color: tc.text }]}>Gastos por categoria</Text>

            {/* Doughnut */}
            <View style={styles.doughnutCenter}>
              <DoughnutChart data={spending} total={totalExpense} tc={tc} />
            </View>

            {/* Legend / detail list */}
            <View style={styles.legendList}>
              {spending.map((cat, i) => {
                const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0
                return (
                  <View
                    key={i}
                    style={[
                      styles.legendRow,
                      i < spending.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tc.borderLight },
                    ]}
                  >
                    <View
                      style={[styles.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]}
                    />
                    <View style={styles.legendName}>
                      <IconDisplay name={cat.category_name} size={14} color={tc.text} />
                      <Text style={[styles.legendNameText, { color: tc.text }]} numberOfLines={1}>
                        {cat.category_name}
                      </Text>
                    </View>
                    <Text style={[styles.legendPct, { color: tc.textMuted }]}>
                      {Math.round(pct)}%
                    </Text>
                    <Text style={[styles.legendAmount, { color: tc.text }]}>
                      {formatKz(cat.total)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        ) : (
          !isLoading && (
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={48} color={tc.textMuted} />
              <Text style={[styles.emptyText, { color: tc.textMuted }]}>
                Registe transacções para ver os relatórios
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700' },

  // Period selector
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: 13, fontWeight: '500' },
  periodTextActive: { color: '#fff', fontWeight: '600' },

  // Summary cards — 3 in a row
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
  },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },

  // Savings rate
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  savingsLabel: { fontSize: 12 },
  savingsValue: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  savingsHint: { fontSize: 11, marginLeft: 'auto' },

  // Chart cards
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },

  // Doughnut
  doughnutCenter: { alignItems: 'center', marginBottom: 16 },

  // Legend list
  legendList: { gap: 0 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendNameText: { fontSize: 13, flexShrink: 1 },
  legendPct: { fontSize: 11, minWidth: 30, textAlign: 'right' },
  legendAmount: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600', minWidth: 90, textAlign: 'right' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
})
