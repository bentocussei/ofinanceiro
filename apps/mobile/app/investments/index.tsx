import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo } from 'react'
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Rect } from 'react-native-svg'

import FadeInView from '../../components/common/FadeInView'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { Investment, useInvestmentsStore } from '../../stores/investments'

const CHART_PALETTE = [
  '#0D9488',
  '#D97706',
  '#2563EB',
  '#7C3AED',
  '#15803D',
  '#EA580C',
  '#DB2777',
  '#B91C1C',
]

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Acoes',
  bonds: 'Obrigacoes',
  real_estate: 'Imobiliario',
  mutual_fund: 'Fundos',
  crypto: 'Cripto',
  fixed_deposit: 'Deposito a Prazo',
  other: 'Outro',
}

interface AllocationSlice {
  type: string
  label: string
  value: number
  share: number
  percentage: number
  color: string
}

type InsightSeverity = 'info' | 'warning' | 'critical'

interface Insight {
  id: string
  severity: InsightSeverity
  title: string
  description: string
  recommendation: string
}

type RiskProfile = 'Conservador' | 'Moderado' | 'Agressivo'

function getRiskColor(profile: RiskProfile): string {
  if (profile === 'Conservador') return colors.success
  if (profile === 'Agressivo') return colors.error
  return colors.warning
}

function getRiskBgColor(profile: RiskProfile): string {
  if (profile === 'Conservador') return colors.successLight
  if (profile === 'Agressivo') return colors.errorLight
  return colors.warningLight
}

function getSeverityColor(sev: InsightSeverity): string {
  if (sev === 'warning') return colors.warning
  if (sev === 'critical') return colors.error
  return colors.primary
}

function getSeverityIcon(
  sev: InsightSeverity,
): 'information-circle-outline' | 'warning-outline' | 'alert-circle-outline' {
  if (sev === 'warning') return 'warning-outline'
  if (sev === 'critical') return 'alert-circle-outline'
  return 'information-circle-outline'
}

export default function InvestmentsScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { investments, isLoading, fetchInvestments, deleteInvestment } = useInvestmentsStore()

  useEffect(() => { fetchInvestments() }, [])
  const onRefresh = useCallback(() => fetchInvestments(), [])

  const portfolio = useMemo(() => {
    const total = investments.reduce((s, inv) => s + inv.current_value, 0)
    if (investments.length === 0 || total === 0) {
      return { total: 0, slices: [] as AllocationSlice[], score: 0, topSlice: null as AllocationSlice | null }
    }

    // Group by type
    const byType = new Map<string, number>()
    for (const inv of investments) {
      byType.set(inv.type, (byType.get(inv.type) ?? 0) + inv.current_value)
    }

    // Sort descending by value for deterministic color assignment
    const entries = Array.from(byType.entries()).sort((a, b) => b[1] - a[1])
    const slices: AllocationSlice[] = entries.map(([type, value], idx) => {
      const share = value / total
      return {
        type,
        label: TYPE_LABELS[type] ?? type,
        value,
        share,
        percentage: Math.round(share * 1000) / 10,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      }
    })

    // HHI-based diversification score (0-100)
    const hhi = slices.reduce((s, sl) => s + sl.share * sl.share, 0)
    const score = Math.max(0, Math.min(100, Math.round((1 - hhi) * 100)))

    const topSlice = slices[0] && slices[0].share > 0.6 ? slices[0] : null

    return { total, slices, score, topSlice }
  }, [investments])

  const analysis = useMemo(() => {
    if (investments.length === 0) {
      return null
    }

    const totalInvested = investments.reduce((s, inv) => s + inv.invested_amount, 0)
    const totalCurrent = investments.reduce((s, inv) => s + inv.current_value, 0)
    const returnPct = totalInvested > 0
      ? ((totalCurrent - totalInvested) / totalInvested) * 100
      : 0

    // Risk profile
    const conservativeShare = portfolio.slices
      .filter((sl) => sl.type === 'fixed_deposit' || sl.type === 'bonds')
      .reduce((s, sl) => s + sl.share, 0)
    const aggressiveShare = portfolio.slices
      .filter((sl) => sl.type === 'crypto' || sl.type === 'stocks')
      .reduce((s, sl) => s + sl.share, 0)

    let riskProfile: RiskProfile = 'Moderado'
    if (conservativeShare > 0.7) riskProfile = 'Conservador'
    else if (aggressiveShare > 0.5) riskProfile = 'Agressivo'

    const insights: Insight[] = []

    // 1. Low diversification score
    if (portfolio.score < 50 && portfolio.slices.length > 0) {
      insights.push({
        id: 'diversification',
        severity: 'warning',
        title: 'Portfolio pouco diversificado',
        description: 'O seu portfolio esta concentrado em poucos tipos de activos',
        recommendation: 'Considere adicionar obrigacoes ou fundos para equilibrar',
      })
    }

    // 2. Single type > 60%
    if (portfolio.topSlice) {
      insights.push({
        id: 'concentration',
        severity: 'warning',
        title: `Concentracao elevada em ${portfolio.topSlice.label}`,
        description: `${portfolio.topSlice.percentage}% do seu portfolio esta em ${portfolio.topSlice.label}`,
        recommendation: 'Distribua investimentos por outros tipos',
      })
    }

    // 3. Excellent performance
    if (totalInvested > 0 && returnPct > 15) {
      insights.push({
        id: 'excellent',
        severity: 'info',
        title: 'Desempenho excelente',
        description: `O seu portfolio cresceu ${returnPct.toFixed(1)}% desde o investimento`,
        recommendation: 'Considere realizar alguns ganhos ou reinvestir',
      })
    }

    // 4. Significant loss
    if (totalInvested > 0 && returnPct < -10) {
      insights.push({
        id: 'loss',
        severity: 'critical',
        title: 'Perda significativa',
        description: `O portfolio caiu ${Math.abs(returnPct).toFixed(1)}% desde o investimento`,
        recommendation: 'Avalie se vale a pena reposicionar ou aguardar recuperacao',
      })
    }

    // 6. Initial portfolio
    if (investments.length < 3) {
      insights.push({
        id: 'initial',
        severity: 'info',
        title: 'Portfolio inicial',
        description: `Tem apenas ${investments.length} investimento${investments.length === 1 ? '' : 's'}`,
        recommendation: 'Diversificar pode reduzir risco. Comece com fundos de indice',
      })
    }

    return { riskProfile, insights }
  }, [investments, portfolio])

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
        onPress={() => router.push(`/investments/${item.id}`)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="trending-up-outline" size={22} color={tc.text} />
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
            color={isPositive ? colors.success : colors.error}
          />
          <Text style={[styles.returnText, { color: isPositive ? colors.success : colors.error }]}>
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

  const renderAllocation = () => {
    if (portfolio.slices.length === 0) return null

    const screenWidth = Dimensions.get('window').width
    const cardInnerPadding = 16
    const listPadding = 16
    const barWidth = Math.max(1, screenWidth - listPadding * 2 - cardInnerPadding * 2)
    const barHeight = 14

    // Precompute cumulative segment positions so rounding doesn't leave gaps
    let cursor = 0
    const segments = portfolio.slices.map((slice) => {
      const w = slice.share * barWidth
      const seg = { x: cursor, width: w, color: slice.color, type: slice.type }
      cursor += w
      return seg
    })

    const scoreColor =
      portfolio.score >= 70
        ? colors.success
        : portfolio.score >= 50
          ? colors.warning
          : colors.error
    const scoreText =
      portfolio.score >= 70
        ? 'Portfolio bem diversificado'
        : portfolio.score >= 50
          ? 'Diversificacao moderada — considere expandir'
          : 'Portfolio concentrado — risco elevado'

    return (
      <FadeInView style={styles.allocSection}>
        <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
          ALOCACAO DE PORTFOLIO
        </Text>

        {/* Portfolio Allocation Card */}
        <View style={[styles.allocCard, { backgroundColor: tc.card }]}>
          <Text style={[styles.allocTitle, { color: tc.text }]}>Distribuicao por Tipo</Text>

          <View style={[styles.barWrapper, { backgroundColor: tc.separator }]}>
            <Svg width={barWidth} height={barHeight}>
              {segments.map((seg, idx) => (
                <Rect
                  key={`${seg.type}-${idx}`}
                  x={seg.x}
                  y={0}
                  width={seg.width}
                  height={barHeight}
                  fill={seg.color}
                />
              ))}
            </Svg>
          </View>

          <View style={styles.legend}>
            {portfolio.slices.map((slice) => (
              <View key={slice.type} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text
                  style={[styles.legendLabel, { color: tc.text }]}
                  numberOfLines={1}
                >
                  {slice.label}
                </Text>
                <Text style={[styles.legendPct, { color: tc.textSecondary }]}>
                  {slice.percentage.toFixed(1)}%
                </Text>
                <Text style={[styles.legendValue, { color: tc.text }]}>
                  {formatKz(slice.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Diversification Score Card */}
        <View style={[styles.allocCard, { backgroundColor: tc.card }]}>
          <Text style={[styles.divLabel, { color: tc.textSecondary }]}>
            Score de Diversificacao
          </Text>
          <Text style={[styles.divScore, { color: tc.text }]}>{portfolio.score}</Text>
          <View style={[styles.divBarBg, { backgroundColor: tc.separator }]}>
            <View
              style={[
                styles.divBarFill,
                { width: `${portfolio.score}%`, backgroundColor: scoreColor },
              ]}
            />
          </View>
          <Text style={[styles.divText, { color: tc.textSecondary }]}>{scoreText}</Text>
        </View>

        {/* Concentration Warning */}
        {portfolio.topSlice && (
          <View style={[styles.warningCard, { backgroundColor: colors.warningLight }]}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              Atencao: {portfolio.topSlice.percentage.toFixed(1)}% do portfolio em{' '}
              {portfolio.topSlice.label}. Considere diversificar.
            </Text>
          </View>
        )}
      </FadeInView>
    )
  }

  const renderInsights = () => {
    if (!analysis) return null
    return (
      <View style={styles.insightsSection}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          INSIGHTS E RECOMENDACOES
        </Text>

        {/* Risk profile card */}
        <View style={[styles.riskCard, { backgroundColor: tc.card }]}>
          <Text style={[styles.riskLabel, { color: tc.textSecondary }]}>Perfil de Risco</Text>
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: getRiskBgColor(analysis.riskProfile) },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={getRiskColor(analysis.riskProfile)}
            />
            <Text
              style={[
                styles.riskBadgeText,
                { color: getRiskColor(analysis.riskProfile) },
              ]}
            >
              {analysis.riskProfile}
            </Text>
          </View>
        </View>

        {/* Insight cards */}
        {analysis.insights.map((insight) => {
          const sevColor = getSeverityColor(insight.severity)
          const sevIcon = getSeverityIcon(insight.severity)
          return (
            <View
              key={insight.id}
              style={[styles.insightCard, { backgroundColor: tc.card }]}
            >
              <Ionicons
                name={sevIcon}
                size={22}
                color={sevColor}
                style={styles.insightIcon}
              />
              <View style={styles.insightBody}>
                <Text style={[styles.insightTitle, { color: tc.text }]}>
                  {insight.title}
                </Text>
                <Text style={[styles.insightDesc, { color: tc.textSecondary }]}>
                  {insight.description}
                </Text>
                <Text style={styles.insightRec}>{insight.recommendation}</Text>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  const renderHeader = () => (
    <View>
      {renderAllocation()}
      {renderInsights()}
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Investimentos</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={[styles.addBtn, isDark && styles.addBtnDark]}
            onPress={() => router.push('/investments/simulator')}
          >
            <Ionicons name="calculator-outline" size={18} color={colors.warning} />
          </Pressable>
          <Pressable
            style={[styles.addBtn, isDark && styles.addBtnDark]}
            onPress={() => router.push('/investments/create')}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={investments}
        keyExtractor={(item) => item.id}
        renderItem={renderInvestment}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trending-up-outline" size={48} color={tc.handle} />
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
  container: { flex: 1, backgroundColor: colors.light.bg },
  containerDark: { backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.light.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  addBtnDark: { backgroundColor: colors.brand },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.light.card, borderRadius: 16, padding: 16 },
  cardDark: { backgroundColor: colors.dark.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.light.text },
  institution: { fontSize: 13, color: colors.light.textMuted, marginTop: 2 },
  detailsRow: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  detailCol: {},
  detailLabel: { fontSize: 11, color: colors.light.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', fontFamily: 'monospace', color: colors.light.text },
  returnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  returnText: { fontSize: 13, fontWeight: '600' },
  rateText: { fontSize: 12, color: colors.light.textMuted, marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: colors.light.textMuted },
  emptySubtext: { fontSize: 13, color: colors.light.handle, textAlign: 'center' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
  insightsSection: { marginBottom: 16, gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.light.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  riskLabel: { fontSize: 14, fontWeight: '600' },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  riskBadgeText: { fontSize: 12, fontWeight: '700' },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  insightIcon: { marginTop: 1 },
  insightBody: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: '600' },
  insightDesc: { fontSize: 13, marginTop: 2 },
  insightRec: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.primary,
    marginTop: 4,
  },
  // Portfolio allocation section
  allocSection: { marginBottom: 16 },
  allocCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  allocTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  barWrapper: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 14,
  },
  legend: { gap: 10 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  legendPct: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    minWidth: 46,
    textAlign: 'right',
  },
  legendValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    minWidth: 90,
    textAlign: 'right',
  },
  divLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  divScore: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  divBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  divBarFill: {
    height: 8,
    borderRadius: 4,
  },
  divText: {
    fontSize: 12,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warningDark,
    lineHeight: 18,
  },
})
