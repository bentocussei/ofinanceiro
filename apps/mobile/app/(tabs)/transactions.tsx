import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect } from 'react'
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

import { formatKz, formatRelativeDate } from '../../lib/format'
import { Transaction, useTransactionsStore } from '../../stores/transactions'

export default function TransactionsScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { transactions, fetchTransactions, isLoading, hasMore } = useTransactionsStore()

  useEffect(() => {
    fetchTransactions(true)
  }, [])

  const onRefresh = useCallback(() => fetchTransactions(true), [])
  const onEndReached = useCallback(() => {
    if (hasMore && !isLoading) fetchTransactions(false)
  }, [hasMore, isLoading])

  // Group transactions by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, txn) => {
    const date = txn.transaction_date
    if (!acc[date]) acc[date] = []
    acc[date].push(txn)
    return acc
  }, {})

  const sections = Object.entries(grouped).map(([date, items]) => ({
    date,
    items,
    total: items.reduce(
      (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
      0
    ),
  }))

  const flatData = sections.flatMap((section) => [
    { type: 'header' as const, date: section.date, total: section.total },
    ...section.items.map((item) => ({ type: 'item' as const, ...item })),
  ])

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
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
      <View style={[styles.txnRow, isDark && styles.txnRowDark]}>
        <View style={styles.txnInfo}>
          <Text style={[styles.txnDesc, isDark && styles.textLight]}>
            {item.description || 'Sem descrição'}
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
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.textLight]}>Transacções</Text>
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item, index) => (item.type === 'header' ? `h-${item.date}` : item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>
              Nenhuma transacção registada
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
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
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
