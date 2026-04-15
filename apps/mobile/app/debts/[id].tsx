import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { Debt, useDebtsStore } from '../../stores/debts'

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const { updateDebt, registerPayment, deleteDebt } = useDebtsStore()

  const [debt, setDebt] = useState<Debt | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBalance, setEditBalance] = useState('')
  const [saving, setSaving] = useState(false)

  // Payment
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

  useEffect(() => {
    if (id) {
      apiFetch<Debt>(`/api/v1/debts/${id}`)
        .then((d) => {
          setDebt(d)
          setEditName(d.name)
          setEditBalance(String(d.current_balance / 100))
        })
        .catch(() => {
          Alert.alert('Erro', 'Dívida não encontrada')
          router.back()
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  async function handleSave() {
    if (!debt) return
    setSaving(true)
    try {
      const balanceCentavos = Math.round(parseFloat(editBalance) * 100)
      await updateDebt(debt.id, {
        name: editName.trim(),
        current_balance: balanceCentavos > 0 ? balanceCentavos : undefined,
      })
      const updated = await apiFetch<Debt>(`/api/v1/debts/${debt.id}`)
      setDebt(updated)
      setEditing(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handlePayment() {
    if (!debt || !payAmount.trim()) return
    const amountCentavos = Math.round(parseFloat(payAmount) * 100)
    if (amountCentavos <= 0) {
      Alert.alert('Erro', 'Valor inválido')
      return
    }
    setPaying(true)
    try {
      await registerPayment(debt.id, amountCentavos, new Date().toISOString().slice(0, 10))
      const updated = await apiFetch<Debt>(`/api/v1/debts/${debt.id}`)
      setDebt(updated)
      setPayAmount('')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Sucesso', `Pagamento de ${formatKz(amountCentavos)} registado`)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao registar pagamento')
    } finally {
      setPaying(false)
    }
  }

  function handleDelete() {
    if (!debt) return
    Alert.alert('Eliminar', `Eliminar "${debt.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteDebt(debt.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.back()
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.loadingText, { color: muted }]}>A carregar...</Text>
      </SafeAreaView>
    )
  }
  if (!debt) return null

  const paidPct = debt.original_amount > 0
    ? Math.max(0, Math.min(100, ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100))
    : 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Dívida</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setEditing(!editing)}>
            <Ionicons name={editing ? 'close' : 'pencil'} size={20} color={text} />
          </Pressable>
          <Pressable onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance card */}
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          {editing ? (
            <>
              <Text style={[styles.label, { color: muted }]}>Nome</Text>
              <TextInput
                style={[styles.input, { borderColor: border, color: text }]}
                value={editName}
                onChangeText={setEditName}
              />
              <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Saldo actual (Kz)</Text>
              <TextInput
                style={[styles.input, { borderColor: border, color: text }]}
                value={editBalance}
                onChangeText={setEditBalance}
                keyboardType="numeric"
              />
              <Pressable
                style={[styles.saveBtn, { backgroundColor: accent }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.saveBtnText, { color: isDark ? colors.dark.bg : colors.light.bg }]}>
                  {saving ? 'A guardar...' : 'Guardar'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.debtName, { color: text }]}>{debt.name}</Text>
              <Text style={[styles.debtBalance, { color: colors.error }]}>
                {formatKz(debt.current_balance)}
              </Text>
              <Text style={[styles.debtOriginal, { color: muted }]}>
                de {formatKz(debt.original_amount)} original
              </Text>

              {/* Progress */}
              <View style={styles.progressSection}>
                <View style={[styles.progressBg, { backgroundColor: tc.border }]}>
                  <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
                </View>
                <Text style={[styles.progressText, { color: muted }]}>
                  {paidPct.toFixed(0)}% pago
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Details */}
        {!editing && (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            {debt.creditor && (
              <Row label="Credor" value={debt.creditor} text={text} muted={muted} border={border} />
            )}
            <Row label="Tipo" value={debt.type} text={text} muted={muted} border={border} />
            {debt.interest_rate != null && (
              <Row label="Taxa de juro" value={`${debt.interest_rate}%`} text={text} muted={muted} border={border} />
            )}
            {debt.monthly_payment != null && (
              <Row label="Pagamento mensal" value={formatKz(debt.monthly_payment)} text={text} muted={muted} border={border} />
            )}
          </View>
        )}

        {/* Register payment */}
        {!editing && (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Registar pagamento</Text>
            <View style={styles.payRow}>
              <TextInput
                style={[styles.payInput, { borderColor: border, color: text }]}
                value={payAmount}
                onChangeText={setPayAmount}
                placeholder="Valor em Kz"
                placeholderTextColor={muted}
                keyboardType="numeric"
              />
              <Pressable
                style={[styles.payBtn, { backgroundColor: accent }, paying && { opacity: 0.6 }]}
                onPress={handlePayment}
                disabled={paying || !payAmount.trim()}
              >
                <Text style={[styles.payBtnText, { color: isDark ? colors.dark.bg : colors.light.bg }]}>
                  {paying ? '...' : 'Pagar'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, text, muted, border }: { label: string; value: string; text: string; muted: string; border: string }) {
  return (
    <View style={[rowStyles.row, { borderBottomColor: border }]}>
      <Text style={[rowStyles.label, { color: muted }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: text }]}>{value}</Text>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
})

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 16 },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 20 },
  debtName: { fontSize: 18, fontWeight: '700' },
  debtBalance: { fontSize: 32, fontWeight: '700', fontFamily: 'monospace', marginTop: 8 },
  debtOriginal: { fontSize: 13, marginTop: 4 },
  progressSection: { marginTop: 16 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.success },
  progressText: { fontSize: 12, marginTop: 6, textAlign: 'right' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, fontSize: 16 },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  payRow: { flexDirection: 'row', gap: 10 },
  payInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, fontSize: 16 },
  payBtn: { borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  payBtnText: { fontSize: 15, fontWeight: '600' },
})
