import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
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

import FAB from '../../components/common/FAB'
import CreateTransactionSheet from '../../components/transactions/CreateTransactionSheet'
import { formatKz, formatRelativeDate } from '../../lib/format'
import { useAccountsStore } from '../../stores/accounts'
import { Transaction, useTransactionsStore } from '../../stores/transactions'

export default function HomeScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const router = useRouter()
  const txnSheetRef = useRef<BottomSheet>(null)

  const { summary, fetchSummary } = useAccountsStore()
  const { transactions, fetchTransactions, isLoading } = useTransactionsStore()

  useEffect(() => {
    fetchSummary()
    fetchTransactions(true)
  }, [])

  const onRefresh = useCallback(() => {
    fetchSummary()
    fetchTransactions(true)
  }, [])

  const recentTransactions = transactions.slice(0, 5)

  const incomeThisMonth = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenseThisMonth = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[styles.txnRow, isDark && styles.txnRowDark]}>
      <View style={styles.txnInfo}>
        <Text style={[styles.txnDesc, isDark && styles.textLight]}>
          {item.description || 'Sem descrição'}
        </Text>
        <Text style={[styles.txnDate, isDark && styles.textMuted]}>
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
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
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
              <Text style={[styles.greeting, isDark && styles.textLight]}>
                O Financeiro
              </Text>
            </View>

            <View style={[styles.balanceCard, isDark && styles.cardDark]}>
              <Text style={[styles.balanceLabel, isDark && styles.textMuted]}>
                Saldo total
              </Text>
              <Text style={[styles.balanceAmount, isDark && styles.textLight]}>
                {formatKz(summary?.net_worth ?? 0)}
              </Text>

              <View style={styles.incomeExpenseRow}>
                <View style={styles.incomeExpenseItem}>
                  <Ionicons name="arrow-up-circle" size={20} color="#22c55e" />
                  <View>
                    <Text style={[styles.ieLabel, isDark && styles.textMuted]}>Receitas</Text>
                    <Text style={[styles.ieAmount, styles.income]}>{formatKz(incomeThisMonth)}</Text>
                  </View>
                </View>
                <View style={styles.incomeExpenseItem}>
                  <Ionicons name="arrow-down-circle" size={20} color="#ef4444" />
                  <View>
                    <Text style={[styles.ieLabel, isDark && styles.textMuted]}>Despesas</Text>
                    <Text style={[styles.ieAmount, styles.expense]}>{formatKz(expenseThisMonth)}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
                Últimas transacções
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAll}>Ver todas</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>
              Nenhuma transacção registada
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#000' },
  balanceCard: {
    marginHorizontal: 16, marginVertical: 12, padding: 20,
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardDark: { backgroundColor: '#1a1a1a' },
  balanceLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  incomeExpenseRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  incomeExpenseItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ieLabel: { fontSize: 12, color: '#666' },
  ieAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  income: { color: '#22c55e' },
  expense: { color: '#ef4444' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  seeAll: { fontSize: 14, color: '#3b82f6' },
  txnRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  txnRowDark: { backgroundColor: '#1a1a1a', borderBottomColor: '#333' },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 15, color: '#000', marginBottom: 2 },
  txnDate: { fontSize: 12, color: '#999' },
  txnAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
