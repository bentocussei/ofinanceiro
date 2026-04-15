import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
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

import { apiFetch } from '../../lib/api'
import { formatKz, formatRelativeDate } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { useAccountsStore } from '../../stores/accounts'

interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  institution: string | null
  icon: string | null
}

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  description: string | null
  transaction_date: string
}

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const { fetchSummary } = useAccountsStore()

  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [saving, setSaving] = useState(false)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const [acc, txns] = await Promise.all([
        apiFetch<Account>(`/api/v1/accounts/${id}`),
        apiFetch<{ items: Transaction[] }>(`/api/v1/transactions/?account_id=${id}&limit=20`).catch(() => ({ items: [] })),
      ])
      setAccount(acc)
      setEditName(acc.name)
      setEditInstitution(acc.institution || '')
      setTransactions(txns.items)
    } catch {
      Alert.alert('Erro', 'Conta não encontrada')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSave() {
    if (!account) return
    setSaving(true)
    try {
      const updated = await apiFetch<Account>(`/api/v1/accounts/${account.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          institution: editInstitution.trim() || null,
        }),
      })
      setAccount(updated)
      setEditing(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      fetchSummary()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!account) return
    Alert.alert('Eliminar conta', `Eliminar "${account.name}"? Todas as transacções associadas serão mantidas.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/v1/accounts/${account.id}`, { method: 'DELETE' })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            fetchSummary()
            router.back()
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao eliminar')
          }
        },
      },
    ])
  }

  if (loading || !account) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.loadingText, { color: muted }]}>A carregar...</Text>
      </SafeAreaView>
    )
  }

  const typeLabels: Record<string, string> = {
    bank: 'Banco', wallet: 'Carteira', cash: 'Dinheiro',
    savings: 'Poupança', credit: 'Crédito', investment: 'Investimento',
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Conta</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setEditing(!editing)}>
            <Ionicons name={editing ? 'close' : 'pencil'} size={20} color={text} />
          </Pressable>
          <Pressable onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            {/* Balance card */}
            <View style={[styles.balanceCard, { backgroundColor: card, borderColor: border }]}>
              {editing ? (
                <>
                  <Text style={[styles.label, { color: muted }]}>Nome</Text>
                  <TextInput
                    style={[styles.input, { borderColor: border, color: text }]}
                    value={editName}
                    onChangeText={setEditName}
                  />
                  <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Instituicao</Text>
                  <TextInput
                    style={[styles.input, { borderColor: border, color: text }]}
                    value={editInstitution}
                    onChangeText={setEditInstitution}
                    placeholder="Ex: BAI, BFA"
                    placeholderTextColor={muted}
                  />
                  <Pressable
                    style={[styles.saveBtn, { backgroundColor: accent }, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={[styles.saveBtnText, { color: isDark ? '#000' : '#fff' }]}>
                      {saving ? 'A guardar...' : 'Guardar'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={[styles.accName, { color: text }]}>{account.name}</Text>
                  {account.institution && (
                    <Text style={[styles.accInst, { color: muted }]}>{account.institution}</Text>
                  )}
                  <Text style={[styles.accBalance, { color: account.balance >= 0 ? colors.success : colors.error }]}>
                    {formatKz(account.balance)}
                  </Text>
                  <Text style={[styles.accType, { color: muted }]}>
                    {typeLabels[account.type] || account.type}
                  </Text>
                </>
              )}
            </View>

            {/* Section header */}
            {!editing && transactions.length > 0 && (
              <Text style={[styles.sectionTitle, { color: text }]}>Transacções recentes</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.txnRow, { backgroundColor: card, borderBottomColor: border }]}
            onPress={() => router.push(`/transaction/${item.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.txnDesc, { color: text }]}>
                {item.description || 'Sem descrição'}
              </Text>
              <Text style={[styles.txnDate, { color: muted }]}>
                {formatRelativeDate(item.transaction_date)}
              </Text>
            </View>
            <Text style={[styles.txnAmount, item.type === 'income' ? styles.income : styles.expense]}>
              {item.type === 'income' ? '+' : '-'}{formatKz(item.amount)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !editing ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={muted} />
              <Text style={[styles.emptyText, { color: muted }]}>Sem transacções nesta conta</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  balanceCard: { borderRadius: 14, borderWidth: 1, padding: 20 },
  accName: { fontSize: 20, fontWeight: '700' },
  accInst: { fontSize: 14, marginTop: 2 },
  accBalance: { fontSize: 32, fontWeight: '700', fontFamily: 'monospace', marginTop: 12 },
  accType: { fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, fontSize: 16 },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  txnRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderRadius: 0,
  },
  txnDesc: { fontSize: 15, marginBottom: 2 },
  txnDate: { fontSize: 12 },
  txnAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  income: { color: colors.success },
  expense: { color: colors.error },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14 },
})
