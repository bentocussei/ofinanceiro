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
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { formatDate, formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { RecurringRule, useRecurringRulesStore } from '../../stores/recurring-rules'

const RULE_TYPES = [
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
]

const FREQUENCIES = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
]

export default function RecurringRulesScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { rules, isLoading, fetchRules, createRule, updateRule, deleteRule } = useRecurringRulesStore()
  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['85%'], [])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [frequency, setFrequency] = useState('monthly')
  const [nextDueDate, setNextDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { fetchRules() }, [])
  const onRefresh = useCallback(() => fetchRules(), [])

  const resetForm = () => {
    setEditingId(null); setDescription(''); setAmount(''); setType('expense'); setFrequency('monthly'); setNextDueDate('')
  }

  const openEdit = (rule: RecurringRule) => {
    setEditingId(rule.id)
    setDescription(rule.description)
    setAmount(String(rule.amount / 100))
    setType(rule.type)
    setFrequency(rule.frequency)
    setNextDueDate(rule.next_due_date?.slice(0, 10) || '')
    sheetRef.current?.expand()
  }

  const openCreate = () => { resetForm(); sheetRef.current?.expand() }

  const handleSubmit = async () => {
    if (!description.trim()) { Alert.alert('Erro', 'A descricao e obrigatoria'); return }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Erro', 'Defina o valor'); return }

    setIsSubmitting(true)
    try {
      const data = {
        description: description.trim(),
        amount: Math.round(parseFloat(amount) * 100),
        type,
        frequency,
        next_due_date: nextDueDate.trim() || undefined,
      }
      if (editingId) {
        await updateRule(editingId, data)
      } else {
        await createRule(data)
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

  const handleDelete = (rule: RecurringRule) => {
    Alert.alert('Eliminar', `Eliminar regra "${rule.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteRule(rule.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const getFrequencyLabel = (freq: string) =>
    FREQUENCIES.find((f) => f.value === freq)?.label || freq

  const renderItem = ({ item }: { item: RecurringRule }) => {
    const isIncome = item.type === 'income'

    return (
      <Pressable
        style={[styles.card, isDark && styles.cardDark]}
        onPress={() => openEdit(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, isDark && styles.textLight]}>{item.description}</Text>
          </View>
          <Text style={[styles.amount, isIncome ? styles.amountIncome : styles.amountExpense]}>
            {isIncome ? '+' : '-'}{formatKz(item.amount)}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={[styles.typeBadge, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense,
            isDark && (isIncome ? { backgroundColor: '#002e1a' } : { backgroundColor: '#3d0000' })]}>
            <Text style={[styles.typeText, isIncome ? { color: colors.successDark } : { color: colors.errorDark }]}>
              {isIncome ? 'Receita' : 'Despesa'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="repeat-outline" size={14} color={tc.textSecondary} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>
              {getFrequencyLabel(item.frequency)}
            </Text>
          </View>
          {item.next_due_date && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={tc.textSecondary} />
              <Text style={[styles.detailText, isDark && styles.textMuted]}>
                {formatDate(item.next_due_date)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Recorrentes</Text>
        <Pressable
          style={[styles.addBtnHeader, isDark && styles.addBtnDark]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="repeat-outline" size={48} color={tc.handle} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma regra recorrente</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Crie regras para automatizar transacções repetidas
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
          <Text style={[styles.sheetTitle, isDark && styles.textLight]}>Nova regra recorrente</Text>

          <Text style={[styles.label, isDark && styles.textMuted]}>Descrição</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: Renda do apartamento"
            placeholderTextColor={colors.light.textMuted}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Tipo</Text>
          <View style={styles.typeGrid}>
            {RULE_TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.typeChip, isDark && styles.typeChipDark, type === t.value && styles.typeSelected]}
                onPress={() => setType(t.value as 'income' | 'expense')}
              >
                <Text style={[styles.chipLabel, type === t.value && styles.chipLabelSelected]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, isDark && styles.textMuted]}>Valor (Kz)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="0"
            placeholderTextColor={colors.light.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Frequência</Text>
          <View style={styles.typeGrid}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f.value}
                style={[styles.typeChip, isDark && styles.typeChipDark, frequency === f.value && styles.typeSelected]}
                onPress={() => setFrequency(f.value)}
              >
                <Text style={[styles.chipLabel, frequency === f.value && styles.chipLabelSelected]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, isDark && styles.textMuted]}>Próxima data (opcional, AAAA-MM-DD)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: 2026-04-01"
            placeholderTextColor={colors.light.textMuted}
            value={nextDueDate}
            onChangeText={setNextDueDate}
          />

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>{isSubmitting ? 'A guardar...' : editingId ? 'Guardar alteracoes' : 'Criar regra'}</Text>
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
  cardName: { fontSize: 16, fontWeight: '600', color: colors.light.text },
  amount: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  amountIncome: { color: colors.successDark },
  amountExpense: { color: colors.errorDark },
  detailsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: colors.light.textSecondary },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgeIncome: { backgroundColor: colors.successLight },
  typeBadgeExpense: { backgroundColor: colors.errorLight },
  typeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: colors.light.textMuted },
  emptySubtext: { fontSize: 13, color: colors.light.handle, textAlign: 'center' },
  sheet: { backgroundColor: colors.light.card },
  sheetDark: { backgroundColor: colors.dark.card },
  sheetContent: { padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4, color: colors.light.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.light.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: colors.light.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.light.text, backgroundColor: colors.light.input,
  },
  inputDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.input, color: colors.dark.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.light.border, minWidth: 80, backgroundColor: colors.light.card,
  },
  typeChipDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.card },
  typeSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipLabel: { fontSize: 11, color: colors.light.textSecondary },
  chipLabelSelected: { color: colors.primary, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.light.text, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.dark.text, fontSize: 16, fontWeight: '600' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
})
