import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef } from 'react'
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

import { apiFetch } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'

import IconDisplay from '../../components/common/IconDisplay'
import CreateAccountSheet from '../../components/accounts/CreateAccountSheet'
import TransferSheet from '../../components/accounts/TransferSheet'
import FAB from '../../components/common/FAB'
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


export default function AccountsScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const createSheetRef = useRef<BottomSheet>(null)
  const transferSheetRef = useRef<BottomSheet>(null)
  const { accounts, summary, fetchSummary, isLoading } = useAccountsStore()

  useEffect(() => {
    fetchSummary()
  }, [])

  const onRefresh = useCallback(() => fetchSummary(), [])

  const handleAccountAction = (account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Alert.alert(
      account.name,
      `Saldo: ${formatKz(account.balance)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/v1/accounts/${account.id}`, { method: 'DELETE' })
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              fetchSummary()
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível eliminar. A conta pode ter transacções.')
            }
          },
        },
      ]
    )
  }

  const renderAccount = ({ item }: { item: Account }) => (
    <Pressable
      style={[styles.accountRow, isDark && styles.rowDark]}
      onPress={() => router.push(`/accounts/${item.id}`)}
      onLongPress={() => handleAccountAction(item)}
    >
      <View style={styles.accountIcon}><IconDisplay name={item.type} size={24} color={isDark ? '#fff' : '#000'} /></View>
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
    </Pressable>
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
              {accounts.length >= 2 && (
                <Pressable
                  style={[styles.transferBtn, isDark && styles.transferBtnDark]}
                  onPress={() => transferSheetRef.current?.expand()}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#3b82f6" />
                  <Text style={styles.transferBtnText}>Transferir</Text>
                </Pressable>
              )}
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

      <FAB onPress={() => createSheetRef.current?.expand()} />
      <CreateAccountSheet ref={createSheetRef} onCreated={() => fetchSummary()} />
      <TransferSheet ref={transferSheetRef} onTransferred={() => fetchSummary()} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  transferBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
  },
  transferBtnDark: { backgroundColor: '#1e3a5f', borderColor: '#2563eb' },
  transferBtnText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
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
  accountIcon: { marginRight: 12 },
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
