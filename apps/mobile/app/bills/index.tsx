import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { useAccountsStore } from '../../stores/accounts'
import { Bill, useBillsStore } from '../../stores/bills'
import { useCategoriesStore } from '../../stores/categories'

const FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'once', label: 'Única vez' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string; bgDark: string }> = {
  pending: { bg: colors.warningLight, text: colors.warningDark, bgDark: '#3d2e00' },
  paid: { bg: colors.successLight, text: colors.successDark, bgDark: '#002e1a' },
  overdue: { bg: colors.errorLight, text: colors.errorDark, bgDark: '#3d0000' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  overdue: 'Em atraso',
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const getNextDueLabel = (dueDay: number): string => {
  const now = new Date()
  const today = now.getDate()
  let monthIndex = now.getMonth()
  let year = now.getFullYear()
  if (today >= dueDay) {
    monthIndex += 1
    if (monthIndex > 11) {
      monthIndex = 0
      year += 1
    }
  }
  return `${dueDay} de ${MONTHS_PT[monthIndex]}`
}

export default function BillsScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { bills, isLoading, fetchBills, createBill, updateBill, payBill, deleteBill } = useBillsStore()
  const { accounts, fetchAccounts } = useAccountsStore()
  const { fetchCategories, getParentCategories } = useCategoriesStore()
  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['90%'], [])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [autoPay, setAutoPay] = useState(false)
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(null)
  const [reminderDays, setReminderDays] = useState('3')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const expenseCategories = useMemo(() => getParentCategories('expense'), [getParentCategories])

  useEffect(() => {
    fetchBills()
    fetchAccounts()
    fetchCategories()
  }, [])

  const onRefresh = useCallback(() => fetchBills(), [])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setAmount('')
    setDueDay('')
    setFrequency('monthly')
    setDescription('')
    setCategoryId(null)
    setAutoPay(false)
    setPaymentAccountId(null)
    setReminderDays('3')
  }

  const openEdit = (bill: Bill) => {
    setEditingId(bill.id)
    setName(bill.name)
    setAmount(String(bill.amount / 100))
    setDueDay(String(bill.due_day))
    setFrequency(bill.frequency)
    setDescription(bill.description || '')
    setCategoryId(bill.category_id || null)
    setAutoPay(bill.auto_pay || false)
    setPaymentAccountId(bill.payment_account_id || bill.pay_from_account_id || null)
    setReminderDays(bill.reminder_days != null ? String(bill.reminder_days) : '3')
    sheetRef.current?.expand()
  }

  const openCreate = () => {
    resetForm()
    sheetRef.current?.expand()
  }

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'O nome é obrigatório'); return }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Erro', 'Defina o valor'); return }
    if (!dueDay || parseInt(dueDay) < 1 || parseInt(dueDay) > 31) {
      Alert.alert('Erro', 'Defina um dia de vencimento válido (1-31)'); return
    }
    const reminder = parseInt(reminderDays) || 3
    if (reminder < 1 || reminder > 30) {
      Alert.alert('Erro', 'O lembrete deve ser entre 1 e 30 dias'); return
    }

    setIsSubmitting(true)
    try {
      const data: Record<string, unknown> = {
        name: name.trim(),
        amount: Math.round(parseFloat(amount) * 100),
        due_day: parseInt(dueDay),
        frequency,
        description: description.trim() || null,
        category_id: categoryId,
        auto_pay: autoPay,
        payment_account_id: autoPay ? paymentAccountId : null,
        pay_from_account_id: autoPay ? paymentAccountId : null,
        reminder_days: reminder,
      }
      if (editingId) {
        await updateBill(editingId, data)
      } else {
        await createBill(data)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      resetForm()
      sheetRef.current?.close()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePay = (bill: Bill) => {
    Alert.alert('Pagar', `Marcar "${bill.name}" como paga?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Pagar',
        onPress: async () => {
          try {
            await payBill(bill.id)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível registar o pagamento')
          }
        },
      },
    ])
  }

  const handleDelete = (bill: Bill) => {
    Alert.alert('Eliminar', `Eliminar conta "${bill.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteBill(bill.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const getFrequencyLabel = (freq: string) =>
    FREQUENCIES.find((f) => f.value === freq)?.label || freq

  const getCategoryName = (id: string | null | undefined): string | null => {
    if (!id) return null
    const cat = expenseCategories.find((c) => c.id === id)
    return cat ? cat.name : null
  }

  const renderItem = ({ item }: { item: Bill }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending
    const categoryName = getCategoryName(item.category_id)

    return (
      <Pressable
        style={[styles.card, isDark && styles.cardDark]}
        onPress={() => openEdit(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.cardName, isDark && styles.textLight]}>{item.name}</Text>
              {item.auto_pay && (
                <Ionicons name="flash" size={14} color={colors.successDark} />
              )}
            </View>
            <Text style={[styles.amount, isDark && styles.textLight]}>
              {formatKz(item.amount)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isDark ? statusColor.bgDark : statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        {categoryName && (
          <View style={styles.badgeRow}>
            <View style={[styles.categoryBadge, isDark && styles.categoryBadgeDark]}>
              <Ionicons name="pricetag-outline" size={11} color={colors.primary} />
              <Text style={styles.categoryBadgeText}>{categoryName}</Text>
            </View>
          </View>
        )}

        <View style={styles.detailsRow}>
          {item.status !== 'paid' && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={tc.textSecondary} />
              <Text style={[styles.detailText, isDark && styles.textMuted]}>
                Proximo vencimento: {getNextDueLabel(item.due_day)}
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Ionicons name="repeat-outline" size={14} color={tc.textSecondary} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>
              {getFrequencyLabel(item.frequency)}
            </Text>
          </View>
        </View>

        {item.status !== 'paid' && (
          <Pressable style={styles.payBtn} onPress={() => handlePay(item)}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.successDark} />
            <Text style={styles.payBtnText}>Pagar</Text>
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
        <Text style={[styles.title, isDark && styles.textLight]}>Contas a Pagar</Text>
        <Pressable
          style={[styles.addBtnHeader, isDark && styles.addBtnDark]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={tc.handle} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma conta registada</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Adicione as suas contas a pagar para nunca perder um vencimento
            </Text>
          </View>
        }
      />

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={isDark ? styles.sheetDark : styles.sheet}
        handleIndicatorStyle={{ backgroundColor: tc.handle }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={[styles.sheetTitle, isDark && styles.textLight]}>
            {editingId ? 'Editar conta' : 'Nova conta a pagar'}
          </Text>

          <Text style={[styles.label, isDark && styles.textMuted]}>Nome</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: Electricidade"
            placeholderTextColor={colors.light.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Valor (Kz)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="0"
            placeholderTextColor={colors.light.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textarea, isDark && styles.inputDark]}
            placeholder="Detalhes adicionais sobre esta conta"
            placeholderTextColor={colors.light.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Dia de vencimento</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: 15"
            placeholderTextColor={colors.light.textMuted}
            keyboardType="numeric"
            value={dueDay}
            onChangeText={setDueDay}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Frequência</Text>
          <View style={styles.typeGrid}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f.value}
                style={[styles.typeChip, isDark && styles.typeChipDark, frequency === f.value && styles.typeSelected]}
                onPress={() => setFrequency(f.value)}
              >
                <Text style={[styles.typeLabel, frequency === f.value && styles.typeLabelSelected]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, isDark && styles.textMuted]}>Categoria</Text>
          {expenseCategories.length === 0 ? (
            <Text style={[styles.hint, isDark && styles.textMuted]}>A carregar categorias…</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              <Pressable
                style={[
                  styles.typeChip,
                  isDark && styles.typeChipDark,
                  categoryId === null && styles.typeSelected,
                ]}
                onPress={() => setCategoryId(null)}
              >
                <Text style={[styles.typeLabel, categoryId === null && styles.typeLabelSelected]}>
                  Nenhuma
                </Text>
              </Pressable>
              {expenseCategories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.typeChip,
                    isDark && styles.typeChipDark,
                    categoryId === c.id && styles.typeSelected,
                  ]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={[styles.typeLabel, categoryId === c.id && styles.typeLabelSelected]}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, isDark && styles.textLight]}>Pagamento automatico</Text>
              <Text style={[styles.switchHint, isDark && styles.textMuted]}>
                Debitar o valor automaticamente no vencimento
              </Text>
            </View>
            <Switch
              value={autoPay}
              onValueChange={setAutoPay}
              trackColor={{ false: tc.border, true: colors.primary }}
              thumbColor={colors.light.card}
            />
          </View>

          {autoPay && (
            <View style={styles.autoPaySection}>
              <Text style={[styles.label, isDark && styles.textMuted]}>Pagar desde</Text>
              {accounts.length === 0 ? (
                <Text style={[styles.hint, isDark && styles.textMuted]}>
                  Nenhuma conta disponível. Crie uma conta primeiro.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {accounts.map((a) => (
                    <Pressable
                      key={a.id}
                      style={[
                        styles.typeChip,
                        isDark && styles.typeChipDark,
                        paymentAccountId === a.id && styles.typeSelected,
                      ]}
                      onPress={() => setPaymentAccountId(a.id)}
                    >
                      <Text style={[styles.typeLabel, paymentAccountId === a.id && styles.typeLabelSelected]}>
                        {a.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <Text style={[styles.label, isDark && styles.textMuted]}>Lembrar X dias antes</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="3"
            placeholderTextColor={colors.light.textMuted}
            keyboardType="numeric"
            value={reminderDays}
            onChangeText={setReminderDays}
          />
          <Text style={[styles.hint, isDark && styles.textMuted]}>
            Entre 1 e 30 dias antes do vencimento
          </Text>

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>{isSubmitting ? 'A guardar...' : editingId ? 'Guardar alteracoes' : 'Criar conta'}</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheet>
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
  addBtnHeader: {
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.light.text },
  amount: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', color: colors.light.text },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLight, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryBadgeDark: { backgroundColor: colors.brand },
  categoryBadgeText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: colors.light.textSecondary },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  payBtnText: { fontSize: 13, color: colors.successDark, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: colors.light.textMuted },
  emptySubtext: { fontSize: 13, color: colors.light.handle, textAlign: 'center' },
  sheet: { backgroundColor: colors.light.card },
  sheetDark: { backgroundColor: colors.dark.card },
  sheetContent: { padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4, color: colors.light.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.light.textSecondary, marginBottom: 6, marginTop: 16 },
  hint: { fontSize: 12, color: colors.light.textMuted, marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: colors.light.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.light.text, backgroundColor: colors.light.input,
  },
  inputDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.input, color: colors.dark.text },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipScroll: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  typeChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.light.border, minWidth: 80, backgroundColor: colors.light.card,
  },
  typeChipDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.card },
  typeSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeLabel: { fontSize: 11, color: colors.light.textSecondary },
  typeLabelSelected: { color: colors.primary, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 20, paddingVertical: 4,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.light.text, marginBottom: 2 },
  switchHint: { fontSize: 12, color: colors.light.textMuted },
  autoPaySection: {
    marginTop: 4, paddingTop: 12, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: colors.light.border,
  },
  submitBtn: { backgroundColor: colors.light.text, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.dark.text, fontSize: 16, fontWeight: '600' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
})
