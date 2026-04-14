import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useCallback, useEffect, useRef, useState } from 'react'
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

import TransferSheet from '../../components/accounts/TransferSheet'
import ContextSwitcher from '../../components/common/ContextSwitcher'
import FadeInView from '../../components/common/FadeInView'
import SpeedDial from '../../components/common/SpeedDial'
import FeedbackSheet from '../../components/feedback/FeedbackSheet'
import CreateTransactionSheet from '../../components/transactions/CreateTransactionSheet'
import { apiFetch } from '../../lib/api'
import { isFamilyContext } from '../../lib/context'
import { formatKz, formatRelativeDate } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { useAccountsStore } from '../../stores/accounts'
import { BudgetStatus, useBudgetsStore } from '../../stores/budgets'
import { useGoalsStore } from '../../stores/goals'
import { Transaction, useTransactionsStore } from '../../stores/transactions'

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

interface CategorySpending {
  category_name: string
  category_icon: string | null
  total: number
  count: number
}

export default function HomeScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const txnSheetRef = useRef<BottomSheet>(null)
  const transferSheetRef = useRef<BottomSheet>(null)
  const feedbackRef = useRef<BottomSheet>(null)

  const { summary, fetchSummary } = useAccountsStore()
  const { transactions, fetchTransactions, isLoading } = useTransactionsStore()
  const { budgets, fetchBudgets, getBudgetStatus } = useBudgetsStore()
  const { goals, fetchGoals } = useGoalsStore()
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [patrimony, setPatrimony] = useState<any>(null)
  const [referralDismissed, setReferralDismissed] = useState<boolean | null>(null)
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [hasFetched, setHasFetched] = useState(false)

  const fetchCategorySpending = useCallback(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const dateFrom = firstDay.toISOString().split('T')[0]
    const dateTo = now.toISOString().split('T')[0]
    apiFetch<CategorySpending[]>(
      `/api/v1/reports/spending-by-category?date_from=${dateFrom}&date_to=${dateTo}`,
    )
      .then((data) => setCategorySpending(Array.isArray(data) ? data : []))
      .catch(() => setCategorySpending([]))
  }, [])

  const fetchPatrimony = useCallback(() => {
    apiFetch<any>('/api/v1/reports/patrimony')
      .then(setPatrimony)
      .catch(() => setPatrimony(null))
  }, [])

  useEffect(() => {
    Promise.all([
      fetchSummary(),
      fetchTransactions(true),
      fetchBudgets(),
      fetchGoals(),
      Promise.resolve(fetchCategorySpending()),
      Promise.resolve(fetchPatrimony()),
    ]).finally(() => setHasFetched(true))
    SecureStore.getItemAsync('referral_banner_dismissed')
      .then((val) => setReferralDismissed(val === 'true'))
      .catch(() => setReferralDismissed(false))
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchSummary(true)
      fetchTransactions(true, true)
      fetchBudgets(true)
      fetchGoals(true)
      fetchCategorySpending()
      fetchPatrimony()
    }, [fetchCategorySpending, fetchPatrimony])
  )


  const handleDismissReferral = useCallback(async () => {
    setReferralDismissed(true)
    try {
      await SecureStore.setItemAsync('referral_banner_dismissed', 'true')
    } catch {
      // ignore persistence errors; banner stays dismissed for this session
    }
  }, [])

  // Fetch budget statuses when budgets change
  useEffect(() => {
    const activeBudgets = budgets.filter((b) => b.is_active).slice(0, 2)
    if (activeBudgets.length === 0) {
      setBudgetStatuses([])
      return
    }
    Promise.all(activeBudgets.map((b) => getBudgetStatus(b.id)))
      .then(setBudgetStatuses)
      .catch(() => setBudgetStatuses([]))
  }, [budgets])

  const onRefresh = useCallback(() => {
    fetchSummary()
    fetchTransactions(true)
    fetchBudgets()
    fetchGoals()
    fetchCategorySpending()
    fetchPatrimony()
  }, [fetchCategorySpending, fetchPatrimony])

  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 2)
  const recentTransactions = transactions.slice(0, 5)

  const topCategorySpending = categorySpending
    .slice()
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
  const totalCategorySpending = categorySpending.reduce((s, c) => s + c.total, 0)

  const incomeThisMonth = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenseThisMonth = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const handleQuickAction = (key: string) => {
    if (key === 'add') {
      txnSheetRef.current?.expand()
    } else if (key === 'transfer') {
      transferSheetRef.current?.expand()
    } else if (key === 'scan') {
      router.push('/scan')
    }
  }

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[styles.txnRow, { backgroundColor: tc.card }]}>
      <View style={styles.txnDotWrap}>
        <View
          style={[
            styles.txnDot,
            { backgroundColor: item.type === 'income' ? colors.success : colors.error },
          ]}
        />
      </View>
      <View style={styles.txnInfo}>
        <Text style={[styles.txnDesc, { color: tc.text }]} numberOfLines={1}>
          {item.description || 'Sem descricao'}
        </Text>
        {item.merchant ? (
          <Text style={[styles.txnMerchant, { color: tc.textMuted }]} numberOfLines={1}>
            {item.merchant}
          </Text>
        ) : null}
        <Text style={[styles.txnDate, { color: tc.textMuted }]}>
          {formatRelativeDate(item.transaction_date)}
        </Text>
      </View>
      <Text
        style={[
          styles.txnAmount,
          item.type === 'income' ? styles.income : styles.expense,
        ]}
      >
        {item.type === 'income' ? '+' : '-'}
        {formatKz(item.amount)}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}>
      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={[styles.greeting, { color: tc.text }]}>
                O Financeiro
              </Text>
              <ContextSwitcher onContextChange={onRefresh} />
            </View>

            {/* Patrimony Hero Card */}
            <FadeInView delay={100}>
              <View style={[styles.balanceCard, { backgroundColor: tc.card }]}>
                <Text style={[styles.balanceLabel, { color: tc.textSecondary }]}>
                  PATRIMONIO LIQUIDO
                </Text>
                <Text style={[styles.balanceAmount, { color: tc.text }]}>
                  {formatKz(patrimony?.net_worth ?? summary?.net_worth ?? 0)}
                </Text>

                {/* Patrimony breakdown — 4 sub-cards in a 2-col grid */}
                <View style={styles.patrimonyGrid}>
                  <View style={[styles.patrimonySubCard, { backgroundColor: tc.cardAlt }]}>
                    <View style={styles.patrimonySubHeader}>
                      <Ionicons name="wallet-outline" size={12} color={colors.success} />
                      <Text style={[styles.patrimonySubLabel, { color: tc.textSecondary }]}>Contas</Text>
                    </View>
                    <Text style={[styles.patrimonySubValue, { color: colors.success }]}>
                      {formatKz(patrimony?.assets?.accounts?.total ?? summary?.total_assets ?? 0)}
                    </Text>
                  </View>
                  <View style={[styles.patrimonySubCard, { backgroundColor: tc.cardAlt }]}>
                    <View style={styles.patrimonySubHeader}>
                      <Ionicons name="trending-up-outline" size={12} color={colors.success} />
                      <Text style={[styles.patrimonySubLabel, { color: tc.textSecondary }]}>Investimentos</Text>
                    </View>
                    <Text style={[styles.patrimonySubValue, { color: colors.success }]}>
                      {formatKz(patrimony?.assets?.investments?.total ?? 0)}
                    </Text>
                  </View>
                  <View style={[styles.patrimonySubCard, { backgroundColor: tc.cardAlt }]}>
                    <View style={styles.patrimonySubHeader}>
                      <Ionicons name="business-outline" size={12} color={colors.success} />
                      <Text style={[styles.patrimonySubLabel, { color: tc.textSecondary }]}>Bens</Text>
                    </View>
                    <Text style={[styles.patrimonySubValue, { color: colors.success }]}>
                      {formatKz(patrimony?.assets?.physical_assets?.total ?? 0)}
                    </Text>
                  </View>
                  <View style={[styles.patrimonySubCard, { backgroundColor: tc.cardAlt }]}>
                    <View style={styles.patrimonySubHeader}>
                      <Ionicons name="card-outline" size={12} color={colors.error} />
                      <Text style={[styles.patrimonySubLabel, { color: tc.textSecondary }]}>Dividas</Text>
                    </View>
                    <Text style={[styles.patrimonySubValue, { color: colors.error }]}>
                      -{formatKz(patrimony?.liabilities?.total ?? summary?.total_liabilities ?? 0)}
                    </Text>
                  </View>
                </View>

                {/* Assets vs Liabilities bar */}
                {patrimony && (patrimony.assets?.total > 0 || patrimony.liabilities?.total > 0) && (
                  <View style={styles.avlWrap}>
                    <View style={styles.avlLabels}>
                      <Text style={[styles.avlLabel, { color: tc.textSecondary }]}>
                        Activos: <Text style={{ color: colors.success, fontWeight: '600', fontFamily: 'monospace' }}>{formatKz(patrimony.assets.total)}</Text>
                      </Text>
                      <Text style={[styles.avlLabel, { color: tc.textSecondary }]}>
                        Passivos: <Text style={{ color: colors.error, fontWeight: '600', fontFamily: 'monospace' }}>{formatKz(patrimony.liabilities.total)}</Text>
                      </Text>
                    </View>
                    <View style={[styles.avlBarBg, { backgroundColor: colors.errorLight }]}>
                      <View
                        style={[
                          styles.avlBarFill,
                          {
                            backgroundColor: colors.success,
                            width: `${
                              patrimony.assets.total + patrimony.liabilities.total > 0
                                ? (patrimony.assets.total /
                                    (patrimony.assets.total + patrimony.liabilities.total)) *
                                  100
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </FadeInView>

            {/* Cash Flow — Income/Expense separate card */}
            <FadeInView delay={150}>
              <View style={styles.cashFlowRow}>
                <View style={[styles.cashFlowCard, { backgroundColor: tc.card }]}>
                  <View style={styles.cashFlowHeader}>
                    <Text style={[styles.cashFlowLabel, { color: tc.textSecondary }]}>Receitas</Text>
                    <Ionicons name="arrow-up" size={14} color={colors.success} />
                  </View>
                  <Text style={[styles.cashFlowValue, { color: colors.success }]}>
                    +{formatKz(incomeThisMonth)}
                  </Text>
                </View>
                <View style={[styles.cashFlowCard, { backgroundColor: tc.card }]}>
                  <View style={styles.cashFlowHeader}>
                    <Text style={[styles.cashFlowLabel, { color: tc.textSecondary }]}>Despesas</Text>
                    <Ionicons name="arrow-down" size={14} color={colors.error} />
                  </View>
                  <Text style={[styles.cashFlowValue, { color: colors.error }]}>
                    -{formatKz(expenseThisMonth)}
                  </Text>
                </View>
              </View>
            </FadeInView>

            {/* Referral Banner */}
            {referralDismissed === false && (
              <FadeInView delay={150}>
                <Pressable
                  style={styles.referralBanner}
                  onPress={() => router.push('/settings/referral')}
                >
                  <Ionicons
                    name="gift-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.referralIcon}
                  />
                  <View style={styles.referralTextWrap}>
                    <Text style={styles.referralTitle}>Convide amigos e ganhe</Text>
                    <Text style={styles.referralSubtitle}>
                      Ganhe 1 mes gratis por cada convite
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={handleDismissReferral}
                    style={styles.referralClose}
                  >
                    <Ionicons name="close" size={18} color={tc.textMuted} />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </Pressable>
              </FadeInView>
            )}

            {/* Active Budgets Preview */}
            {budgetStatuses.length > 0 && (
              <FadeInView delay={225}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
                    ORCAMENTOS ACTIVOS
                  </Text>
                  <Pressable onPress={() => router.push('/budget')}>
                    <Text style={styles.seeAll}>Ver todos</Text>
                  </Pressable>
                </View>
                <View style={styles.previewCards}>
                  {budgetStatuses.map((bs) => {
                    const pct = Math.min(bs.percentage, 100)
                    const barColor =
                      pct >= 90 ? colors.error : pct >= 70 ? colors.warning : colors.success
                    return (
                      <Pressable
                        key={bs.budget_id}
                        style={[styles.previewCard, { backgroundColor: tc.card }]}
                        onPress={() => router.push('/budget')}
                      >
                        <Text style={[styles.previewCardTitle, { color: tc.text }]} numberOfLines={1}>
                          {bs.name || bs.method}
                        </Text>
                        <View style={[styles.progressBarBg, { backgroundColor: tc.borderLight }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${pct}%`, backgroundColor: barColor },
                            ]}
                          />
                        </View>
                        <Text style={[styles.previewCardSub, { color: tc.textMuted }]}>
                          {Math.round(bs.percentage)}% usado · {bs.days_remaining} dias restantes
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </FadeInView>
            )}

            {/* Active Goals Preview */}
            {activeGoals.length > 0 && (
              <FadeInView delay={250}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
                    METAS ACTIVAS
                  </Text>
                  <Pressable onPress={() => router.push('/goals')}>
                    <Text style={styles.seeAll}>Ver todas</Text>
                  </Pressable>
                </View>
                <View style={styles.previewCards}>
                  {activeGoals.map((goal) => {
                    const pct =
                      goal.target_amount > 0
                        ? Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100)
                        : 0
                    const remaining = Math.max(goal.target_amount - goal.current_amount, 0)
                    return (
                      <Pressable
                        key={goal.id}
                        style={[styles.previewCard, { backgroundColor: tc.card }]}
                        onPress={() => router.push('/goals')}
                      >
                        <Text style={[styles.previewCardTitle, { color: tc.text }]} numberOfLines={1}>
                          {goal.name}
                        </Text>
                        <View style={[styles.progressBarBg, { backgroundColor: tc.borderLight }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${pct}%`, backgroundColor: colors.primary },
                            ]}
                          />
                        </View>
                        <Text style={[styles.previewCardSub, { color: tc.textMuted }]}>
                          {pct}% · faltam {formatKz(remaining)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </FadeInView>
            )}

            {/* Section Header */}
            <FadeInView delay={275}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
                  ULTIMAS TRANSACCOES
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/transactions')}>
                  <Text style={styles.seeAll}>Ver todas</Text>
                </Pressable>
              </View>
            </FadeInView>
          </View>
        }
        ListEmptyComponent={
          !hasFetched ? (
            <View>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={{
                    height: 60,
                    backgroundColor: tc.cardAlt,
                    borderRadius: 12,
                    marginHorizontal: 16,
                    marginVertical: 4,
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={tc.handle} />
              <Text style={[styles.emptyText, { color: tc.textMuted }]}>
                Nenhuma transaccao registada
              </Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => txnSheetRef.current?.expand()}
              >
                <Text style={styles.emptyBtnText}>Registar primeira transaccao</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          <>
            {/* Spending by Category Preview — shown after transactions */}
            {topCategorySpending.length > 0 && totalCategorySpending > 0 && (
              <FadeInView delay={100}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
                    GASTOS POR CATEGORIA
                  </Text>
                  <Pressable onPress={() => router.push('/(tabs)/reports')}>
                    <Text style={styles.seeAll}>Ver relatorio</Text>
                  </Pressable>
                </View>
                <View style={styles.categoryWrap}>
                  <View style={[styles.categoryCard, { backgroundColor: tc.card }]}>
                    {topCategorySpending.map((cat, i) => {
                      const pct =
                        totalCategorySpending > 0
                          ? (cat.total / totalCategorySpending) * 100
                          : 0
                      const color = CHART_PALETTE[i % CHART_PALETTE.length]
                      return (
                        <View
                          key={`${cat.category_name}-${i}`}
                          style={[
                            styles.categoryItem,
                            i < topCategorySpending.length - 1 && {
                              marginBottom: 12,
                            },
                          ]}
                        >
                          <View style={styles.categoryRow}>
                            <View
                              style={[styles.categoryDot, { backgroundColor: color }]}
                            />
                            <Text
                              style={[styles.categoryName, { color: tc.text }]}
                              numberOfLines={1}
                            >
                              {cat.category_name}
                            </Text>
                            <Text
                              style={[styles.categoryPct, { color: tc.textMuted }]}
                            >
                              {Math.round(pct)}%
                            </Text>
                            <Text
                              style={[styles.categoryAmount, { color: tc.text }]}
                            >
                              {formatKz(cat.total)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.categoryBarBg,
                              { backgroundColor: tc.borderLight },
                            ]}
                          >
                            <View
                              style={[
                                styles.categoryBarFill,
                                {
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: color,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </View>
              </FadeInView>
            )}

            <View style={styles.footer}>
              <Pressable
                style={styles.feedbackLink}
                onPress={() => feedbackRef.current?.expand()}
              >
                <Ionicons name="chatbubble-outline" size={13} color={tc.textMuted} />
                <Text style={[styles.feedbackText, { color: tc.textMuted }]}>Dar feedback</Text>
              </Pressable>
            </View>
          </>
        }
      />

      <SpeedDial
        actions={[
          {
            key: 'add',
            label: 'Registar transaccao',
            icon: 'add-circle-outline',
            onPress: () => handleQuickAction('add'),
            color: colors.primary,
          },
          {
            key: 'transfer',
            label: 'Transferir entre contas',
            icon: 'swap-horizontal-outline',
            onPress: () => handleQuickAction('transfer'),
          },
          {
            key: 'scan',
            label: 'Digitalizar recibo',
            icon: 'camera-outline',
            onPress: () => handleQuickAction('scan'),
          },
        ]}
      />
      <CreateTransactionSheet ref={txnSheetRef} onCreated={onRefresh} />
      <TransferSheet ref={transferSheetRef} onTransferred={onRefresh} />
      <FeedbackSheet ref={feedbackRef} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: 24, fontWeight: '700' },

  // Balance / Patrimony Hero Card
  balanceCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },

  // Patrimony breakdown sub-cards (2-col grid)
  patrimonyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  patrimonySubCard: {
    width: '48%',
    borderRadius: 10,
    padding: 10,
  },
  patrimonySubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  patrimonySubLabel: {
    fontSize: 11,
  },
  patrimonySubValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  // Assets vs Liabilities bar
  avlWrap: {
    marginTop: 14,
  },
  avlLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  avlLabel: {
    fontSize: 11,
  },
  avlBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  avlBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Cash Flow cards
  cashFlowRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cashFlowCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cashFlowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cashFlowLabel: {
    fontSize: 13,
  },
  cashFlowValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  income: { color: colors.success },
  expense: { color: colors.error },

  // Referral Banner
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
  },
  referralIcon: {
    marginRight: 12,
  },
  referralTextWrap: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  referralSubtitle: {
    fontSize: 12,
    color: colors.primary,
    opacity: 0.8,
    marginTop: 2,
  },
  referralClose: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 2,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },

  // Preview Cards (Budgets & Goals)
  previewCards: {
    paddingHorizontal: 16,
    gap: 10,
  },
  previewCard: {
    borderRadius: 12,
    padding: 12,
  },
  previewCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  previewCardSub: {
    fontSize: 12,
  },

  // Spending by Category
  categoryWrap: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    borderRadius: 14,
    padding: 16,
  },
  categoryItem: {},
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
  },
  categoryPct: {
    fontSize: 12,
    minWidth: 34,
    textAlign: 'right',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    minWidth: 90,
    textAlign: 'right',
  },
  categoryBarBg: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 3,
    borderRadius: 2,
  },

  // Transaction Rows — contained pills (not full-width)
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 3,
    borderRadius: 12,
  },
  txnDotWrap: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  txnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 15, fontWeight: '500', marginBottom: 1 },
  txnMerchant: { fontSize: 12, marginBottom: 1 },
  txnDate: { fontSize: 11 },
  txnAmount: { fontSize: 15, fontWeight: '600', fontFamily: 'monospace' },

  // Empty State
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: colors.primary,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Footer / Feedback
  footer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 100,
    alignItems: 'center',
  },
  feedbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  feedbackText: {
    fontSize: 12,
  },
})
