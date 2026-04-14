import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Swipeable } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import ContextSwitcher from '../../components/common/ContextSwitcher'
import FAB from '../../components/common/FAB'
import CreateTransactionSheet, { TransactionPrefill } from '../../components/transactions/CreateTransactionSheet'
import TransactionFilters, { FilterState } from '../../components/transactions/TransactionFilters'
import { formatKz, formatRelativeDate } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { Transaction, useTransactionsStore } from '../../stores/transactions'

export default function TransactionsScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const params = useLocalSearchParams<{
    prefill_amount?: string
    prefill_description?: string
    prefill_merchant?: string
    prefill_date?: string
  }>()
  const txnSheetRef = useRef<BottomSheet>(null)
  const { transactions, fetchTransactions, deleteTransaction, isLoading, hasMore } =
    useTransactionsStore()

  const [filters, setFilters] = useState<FilterState>({ type: 'all', period: 'month' })
  const [prefill, setPrefill] = useState<TransactionPrefill | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    Promise.resolve(fetchTransactions(true)).finally(() => setHasFetched(true))
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchTransactions(true, true)
    }, [])
  )


  // Handle prefill from receipt scanner
  useEffect(() => {
    if (params.prefill_amount || params.prefill_description) {
      const data: TransactionPrefill = {
        type: 'expense',
      }
      if (params.prefill_amount) data.amount = parseInt(params.prefill_amount, 10)
      if (params.prefill_description) data.description = params.prefill_description
      if (params.prefill_merchant) data.merchant = params.prefill_merchant
      if (params.prefill_date) data.date = params.prefill_date
      setPrefill(data)
      setTimeout(() => txnSheetRef.current?.expand(), 300)
    }
  }, [params.prefill_amount, params.prefill_description])

  const onRefresh = useCallback(() => fetchTransactions(true), [])
  const onEndReached = useCallback(() => {
    if (hasMore && !isLoading) fetchTransactions(false)
  }, [hasMore, isLoading])

  // Apply client-side filters
  const filtered = useMemo(() => {
    let result = transactions

    if (filters.type !== 'all') {
      result = result.filter((t) => t.type === filters.type)
    }

    if (filters.period !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      if (filters.period === 'week') cutoff.setDate(now.getDate() - 7)
      else if (filters.period === 'month') cutoff.setMonth(now.getMonth() - 1)
      else if (filters.period === '3months') cutoff.setMonth(now.getMonth() - 3)
      else if (filters.period === 'year') cutoff.setFullYear(now.getFullYear() - 1)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      result = result.filter((t) => t.transaction_date >= cutoffStr)
    }

    return result
  }, [transactions, filters])

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, txn) => {
    const date = txn.transaction_date
    if (!acc[date]) acc[date] = []
    acc[date].push(txn)
    return acc
  }, {})

  const flatData = Object.entries(grouped).flatMap(([date, items]) => [
    { _type: 'header' as const, date, total: items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0) },
    ...items.map((item) => ({ _type: 'item' as const, ...item })),
  ])

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('Eliminar', 'Tem a certeza que deseja eliminar esta transacção?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }, [deleteTransaction])

  const renderSwipeActions = () => (
    <View style={styles.swipeDelete}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
    </View>
  )

  const renderItem = ({ item }: { item: any }) => {
    if (item._type === 'header') {
      return (
        <View style={[styles.dateHeader, isDark && styles.dateHeaderDark]}>
          <Text style={[styles.dateText, isDark && styles.textLight]}>
            {formatRelativeDate(item.date)}
          </Text>
          <Text style={[styles.dateTotal, item.total >= 0 ? styles.income : styles.expense]}>
            {formatKz(Math.abs(item.total))}
          </Text>
        </View>
      )
    }

    return (
      <Swipeable
        renderRightActions={renderSwipeActions}
        onSwipeableOpen={() => handleDelete(item.id)}
      >
        <Pressable
          style={[styles.txnRow, isDark && styles.txnRowDark]}
          onPress={() => router.push(`/transaction/${item.id}`)}
        >
          <View style={styles.txnInfo}>
            <Text style={[styles.txnDesc, isDark && styles.textLight]}>
              {item.description || 'Sem descrição'}
            </Text>
          </View>
          <Text
            style={[styles.txnAmount, item.type === 'income' ? styles.income : styles.expense]}
          >
            {item.type === 'income' ? '+' : '-'}
            {formatKz(item.amount)}
          </Text>
        </Pressable>
      </Swipeable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.textLight]}>Transacções</Text>
        <ContextSwitcher onContextChange={onRefresh} />
      </View>

      <TransactionFilters filters={filters} onChange={setFilters} />

      <FlatList
        data={flatData}
        keyExtractor={(item, index) => (item._type === 'header' ? `h-${item.date}` : item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !hasFetched ? (
            <View>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={{
                    height: 56,
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
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                {filters.type !== 'all' || filters.period !== 'all'
                  ? 'Nenhuma transacção encontrada com estes filtros'
                  : 'Nenhuma transacção registada'}
              </Text>
            </View>
          )
        }
      />

      <FAB onPress={() => txnSheetRef.current?.expand()} />
      <CreateTransactionSheet ref={txnSheetRef} onCreated={() => { setPrefill(null); onRefresh() }} prefill={prefill} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.bg },
  containerDark: { backgroundColor: colors.dark.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: colors.light.text },
  dateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.light.separator,
  },
  dateHeaderDark: { backgroundColor: colors.dark.cardAlt },
  dateText: { fontSize: 14, fontWeight: '600', color: colors.light.textSecondary },
  dateTotal: { fontSize: 13, fontWeight: '500', fontFamily: 'monospace' },
  txnRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.light.card, borderRadius: 12,
  },
  txnRowDark: { backgroundColor: colors.dark.card },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 15, color: colors.light.text },
  txnAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  income: { color: colors.success },
  expense: { color: colors.error },
  swipeDelete: {
    backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center',
    width: 80,
  },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 15, color: colors.light.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.light.textMuted },
})
