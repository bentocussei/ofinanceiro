import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
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

import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { Debt, useDebtsStore } from '../../stores/debts'

export default function DebtsScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { debts, isLoading, fetchDebts, registerPayment, deleteDebt } = useDebtsStore()
  const [payDebtId, setPayDebtId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  useEffect(() => { fetchDebts() }, [])
  const onRefresh = useCallback(() => fetchDebts(), [])

  const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  const getNextPaymentLabel = (paymentDay: number): string => {
    const today = new Date()
    const currentDay = today.getDate()
    let month = today.getMonth()
    if (currentDay >= paymentDay) {
      month = (month + 1) % 12
    }
    return `${paymentDay} de ${MONTHS_PT[month]}`
  }

  const getDebtStatus = (debt: Debt): 'paid_off' | 'overdue' | 'active' => {
    if (debt.current_balance === 0 || !debt.is_active) return 'paid_off'
    return 'active'
  }

  const hexWithAlpha = (hex: string, alpha: string) => `${hex}${alpha}`

  const handleDelete = (debt: Debt) => {
    Alert.alert('Eliminar', `Eliminar dívida "${debt.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteDebt(debt.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const handlePayment = async () => {
    if (!payDebtId || !payAmount) return
    const amount = Math.round(parseFloat(payAmount) * 100)
    if (amount <= 0) return

    try {
      const today = new Date().toISOString().split('T')[0]
      await registerPayment(payDebtId, amount, today)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setPayDebtId(null)
      setPayAmount('')
    } catch (error: any) {
      Alert.alert('Erro', error.message)
    }
  }

  const renderDebt = ({ item }: { item: Debt }) => {
    const status = getDebtStatus(item)
    const statusConfig =
      status === 'paid_off'
        ? { label: 'QUITADA', bg: hexWithAlpha(colors.success, '22'), fg: colors.success }
        : status === 'overdue'
          ? { label: 'ATRASADA', bg: hexWithAlpha(colors.error, '22'), fg: colors.error }
          : { label: 'ACTIVA', bg: hexWithAlpha(colors.primary, '22'), fg: colors.primary }

    return (
    <Pressable
      style={[styles.card, isDark && styles.cardDark]}
      onPress={() => router.push(`/debts/${item.id}`)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, isDark && styles.textLight]}>{item.name}</Text>
          {item.creditor && (
            <Text style={[styles.creditor, isDark && styles.textMuted]}>{item.creditor}</Text>
          )}
        </View>
        <View style={styles.badgesGroup}>
          <View style={[styles.typeBadge, isDark && { backgroundColor: colors.brand }]}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusConfig.fg }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={[styles.balanceLabel, isDark && styles.textMuted]}>Saldo actual</Text>
        <Text style={[styles.balanceValue, isDark && styles.textLight]}>
          {formatKz(item.current_balance)}
        </Text>
        {item.payment_day != null && status !== 'paid_off' && (
          <Text style={[styles.nextPayment, isDark && styles.textMuted]}>
            Próximo pagamento: {getNextPaymentLabel(item.payment_day)}
          </Text>
        )}
      </View>

      <View style={styles.detailsRow}>
        {item.interest_rate != null && (
          <View style={styles.detailItem}>
            <Ionicons name="trending-up-outline" size={14} color={tc.textSecondary} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>{item.interest_rate}%</Text>
          </View>
        )}
        {item.monthly_payment != null && (
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={tc.textSecondary} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>
              {formatKz(item.monthly_payment)}/mês
            </Text>
          </View>
        )}
      </View>

      {/* Payment section */}
      {payDebtId === item.id ? (
        <View style={styles.payRow}>
          <TextInput
            style={[styles.payInput, isDark && styles.inputDark]}
            placeholder="Valor Kz"
            placeholderTextColor={colors.light.textMuted}
            keyboardType="numeric"
            value={payAmount}
            onChangeText={setPayAmount}
            autoFocus
          />
          <Pressable style={styles.payBtn} onPress={handlePayment}>
            <Text style={styles.payBtnText}>Pagar</Text>
          </Pressable>
          <Pressable onPress={() => setPayDebtId(null)}>
            <Ionicons name="close" size={20} color={colors.light.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.addPayBtn}
          onPress={() => { setPayDebtId(item.id); setPayAmount('') }}
        >
          <Ionicons name="cash-outline" size={18} color={colors.primary} />
          <Text style={styles.addPayText}>Registar pagamento</Text>
        </Pressable>
      )}
    </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Dívidas</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={[styles.addBtn, isDark && styles.addBtnDark]}
            onPress={() => router.push('/debts/simulator')}
          >
            <Ionicons name="calculator-outline" size={18} color={colors.warning} />
          </Pressable>
          <Pressable
            style={[styles.addBtn, isDark && styles.addBtnDark]}
            onPress={() => router.push('/debts/create')}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        renderItem={renderDebt}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={tc.handle} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma dívida registada</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Registe as suas dívidas para acompanhar os pagamentos
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
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.light.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDark: { backgroundColor: colors.brand },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.light.card, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardDark: { backgroundColor: colors.dark.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.light.text },
  creditor: { fontSize: 13, color: colors.light.textMuted, marginTop: 2 },
  typeBadge: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typeText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  badgesGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  nextPayment: { fontSize: 12, color: colors.light.textSecondary, marginTop: 4 },
  amountRow: { marginBottom: 8 },
  balanceLabel: { fontSize: 12, color: colors.light.textSecondary, marginBottom: 2 },
  balanceValue: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace', color: colors.light.text },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: colors.light.textSecondary },
  addPayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addPayText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  payInput: {
    flex: 1, borderWidth: 1, borderColor: colors.light.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: 'monospace', color: colors.light.text,
  },
  inputDark: { borderColor: colors.dark.border, color: colors.dark.text, backgroundColor: colors.dark.input },
  payBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  payBtnText: { color: colors.dark.text, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: colors.light.textMuted },
  emptySubtext: { fontSize: 13, color: colors.light.handle, textAlign: 'center' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
})
