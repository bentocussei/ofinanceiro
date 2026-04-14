import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
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

import ContextSwitcher from '../../components/common/ContextSwitcher'
import IconDisplay from '../../components/common/IconDisplay'
import CreateAccountSheet from '../../components/accounts/CreateAccountSheet'
import TransferSheet from '../../components/accounts/TransferSheet'
import FAB from '../../components/common/FAB'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
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
  const tc = themeColors(isDark)
  const router = useRouter()
  const createSheetRef = useRef<BottomSheet>(null)
  const transferSheetRef = useRef<BottomSheet>(null)
  const { accounts, summary, fetchSummary, isLoading } = useAccountsStore()
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    Promise.resolve(fetchSummary()).finally(() => setHasFetched(true))
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchSummary(true)
    }, [])
  )


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
      <View style={styles.accountIcon}><IconDisplay name={item.type} size={24} color={tc.text} /></View>
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
              <ContextSwitcher onContextChange={onRefresh} />
              {accounts.length >= 2 && (
                <Pressable
                  style={[styles.transferBtn, isDark && styles.transferBtnDark]}
                  onPress={() => transferSheetRef.current?.expand()}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={16}
                    color={isDark ? '#FFFFFF' : colors.primary}
                  />
                  <Text style={[styles.transferBtnText, isDark && { color: '#FFFFFF' }]}>
                    Transferir
                  </Text>
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
              <Ionicons name="wallet-outline" size={48} color={tc.handle} />
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma conta criada</Text>
            </View>
          )
        }
      />

      <FAB onPress={() => createSheetRef.current?.expand()} />
      <CreateAccountSheet ref={createSheetRef} onCreated={() => fetchSummary()} />
      <TransferSheet ref={transferSheetRef} onTransferred={() => fetchSummary()} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.bg },
  containerDark: { backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.light.text },
  transferBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: '#bfdbfe',
  },
  transferBtnDark: { backgroundColor: colors.primary, borderColor: colors.primary },
  transferBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  summaryCard: {
    marginHorizontal: 16, marginVertical: 12, padding: 16,
    backgroundColor: colors.light.card, borderRadius: 12,
  },
  cardDark: { backgroundColor: colors.dark.card },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: colors.light.textSecondary },
  summaryValue: { fontSize: 14, fontFamily: 'monospace', fontWeight: '500' },
  summaryTotal: { borderTopWidth: 0.5, borderTopColor: colors.light.border, marginTop: 4, paddingTop: 10 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '600', color: colors.light.text },
  summaryTotalValue: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace', color: colors.light.text },
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.light.card, borderRadius: 12,
  },
  rowDark: { backgroundColor: colors.dark.card },
  accountIcon: { marginRight: 12 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: '500', color: colors.light.text },
  accountType: { fontSize: 12, color: colors.light.textMuted, marginTop: 2 },
  accountBalance: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  positive: { color: colors.success },
  negative: { color: colors.error },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, color: colors.light.textMuted },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.light.textMuted },
})
