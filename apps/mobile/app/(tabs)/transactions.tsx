import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
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

import FAB from '../../components/common/FAB'
import CreateTransactionSheet from '../../components/transactions/CreateTransactionSheet'
import TransactionFilters, { FilterState } from '../../components/transactions/TransactionFilters'
import { formatKz, formatRelativeDate } from '../../lib/format'
import { Transaction, useTransactionsStore } from '../../stores/transactions'

export default function TransactionsScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const router = useRouter()
  const txnSheetRef = useRef<BottomSheet>(null)
  const { transactions, fetchTransactions, deleteTransaction, isLoading, hasMore } =
    useTransactionsStore()

  const [filters, setFilters] = useState<FilterState>({ type: 'all', period: 'month' })

  useEffect(() => {
    fetchTransactions(true)
  }, [])

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
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>
              {filters.type !== 'all' || filters.period !== 'all'
                ? 'Nenhuma transacção encontrada com estes filtros'
                : 'Nenhuma transacção registada'}
            </Text>
          </View>
        }
      />

      <FAB onPress={() => txnSheetRef.current?.expand()} />
      <CreateTransactionSheet ref={txnSheetRef} onCreated={onRefresh} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  dateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#f0f0f0',
  },
  dateHeaderDark: { backgroundColor: '#111' },
  dateText: { fontSize: 14, fontWeight: '600', color: '#333' },
  dateTotal: { fontSize: 13, fontWeight: '500', fontFamily: 'monospace' },
  txnRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  txnRowDark: { backgroundColor: '#1a1a1a', borderBottomColor: '#333' },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 15, color: '#000' },
  txnAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  income: { color: '#22c55e' },
  expense: { color: '#ef4444' },
  swipeDelete: {
    backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center',
    width: 80,
  },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center', paddingHorizontal: 40 },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
