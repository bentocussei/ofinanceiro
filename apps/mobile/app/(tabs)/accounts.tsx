import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import {
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

import { formatKz } from '../../lib/format'
import { Account, useAccountsStore } from '../../stores/accounts'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: 'Banco',
  digital_wallet: 'Carteira digital',
  cash: 'Dinheiro',
  savings: 'Poupança',
  investment: 'Investimento',
  credit_card: 'Cartão de crédito',
  loan: 'Empréstimo',
}

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  bank: '🏦',
  digital_wallet: '📱',
  cash: '💵',
  savings: '🏦',
  investment: '📈',
  credit_card: '💳',
  loan: '📋',
}

export default function AccountsScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { accounts, summary, fetchSummary, isLoading } = useAccountsStore()

  useEffect(() => {
    fetchSummary()
  }, [])

  const onRefresh = useCallback(() => fetchSummary(), [])

  const renderAccount = ({ item }: { item: Account }) => (
    <View style={[styles.accountRow, isDark && styles.rowDark]}>
      <Text style={styles.accountIcon}>{item.icon || ACCOUNT_TYPE_ICONS[item.type] || '💰'}</Text>
      <View style={styles.accountInfo}>
        <Text style={[styles.accountName, isDark && styles.textLight]}>{item.name}</Text>
        <Text style={[styles.accountType, isDark && styles.textMuted]}>
          {ACCOUNT_TYPE_LABELS[item.type] || item.type}
          {item.institution ? ` · ${item.institution}` : ''}
        </Text>
      </View>
      <Text
        style={[
          styles.accountBalance,
          item.balance >= 0 ? styles.positive : styles.negative,
        ]}
      >
        {formatKz(item.balance)}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccount}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={[styles.title, isDark && styles.textLight]}>Contas</Text>
            </View>
            {summary && (
              <View style={[styles.summaryCard, isDark && styles.cardDark]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, isDark && styles.textMuted]}>Activos</Text>
                  <Text style={[styles.summaryValue, styles.positive]}>{formatKz(summary.total_assets)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, isDark && styles.textMuted]}>Passivos</Text>
                  <Text style={[styles.summaryValue, styles.negative]}>{formatKz(summary.total_liabilities)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={[styles.summaryTotalLabel, isDark && styles.textLight]}>Patrimônio líquido</Text>
                  <Text style={[styles.summaryTotalValue, isDark && styles.textLight]}>{formatKz(summary.net_worth)}</Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma conta criada</Text>
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
  summaryCard: {
    marginHorizontal: 16, marginVertical: 12, padding: 16,
    backgroundColor: '#fff', borderRadius: 12,
  },
  cardDark: { backgroundColor: '#1a1a1a' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontFamily: 'monospace', fontWeight: '500' },
  summaryTotal: { borderTopWidth: 0.5, borderTopColor: '#e5e5e5', marginTop: 4, paddingTop: 10 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '600', color: '#000' },
  summaryTotalValue: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  rowDark: { backgroundColor: '#1a1a1a', borderBottomColor: '#333' },
  accountIcon: { fontSize: 24, marginRight: 12 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: '500', color: '#000' },
  accountType: { fontSize: 12, color: '#999', marginTop: 2 },
  accountBalance: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  positive: { color: '#22c55e' },
  negative: { color: '#ef4444' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
