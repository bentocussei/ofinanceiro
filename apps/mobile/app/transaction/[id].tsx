import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
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
import { formatKz, formatDateFull } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { useTransactionsStore } from '../../stores/transactions'
import { useCategoriesStore, Category } from '../../stores/categories'

interface TransactionDetail {
  id: string
  account_id: string
  category_id: string | null
  category_name?: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  description: string | null
  merchant: string | null
  tags: string[]
  notes: string | null
  transaction_date: string
  is_recurring: boolean
  needs_review: boolean
  is_private: boolean
  created_at: string
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const { deleteTransaction } = useTransactionsStore()
  const { categories, fetchCategories, getParentCategories } = useCategoriesStore()

  const [txn, setTxn] = useState<TransactionDetail | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Edit fields
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editMerchant, setEditMerchant] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
    if (id) {
      apiFetch<TransactionDetail>(`/api/v1/transactions/${id}`)
        .then((data) => {
          setTxn(data)
          populateEditFields(data)
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
          Alert.alert('Erro', 'Transaccao nao encontrada')
          router.back()
        })
    }
  }, [id])

  function populateEditFields(data: TransactionDetail) {
    setEditDescription(data.description || '')
    setEditAmount(String(data.amount / 100))
    setEditMerchant(data.merchant || '')
    setEditNotes(data.notes || '')
    setEditDate(data.transaction_date?.slice(0, 10) || '')
    setEditCategoryId(data.category_id)
  }

  const handleSave = async () => {
    if (!txn) return
    setIsSaving(true)
    try {
      const amountCentavos = Math.round(parseFloat(editAmount) * 100)
      const body: Record<string, unknown> = {}
      if (editDescription.trim() !== (txn.description || '')) body.description = editDescription.trim() || null
      if (amountCentavos > 0 && amountCentavos !== txn.amount) body.amount = amountCentavos
      if (editMerchant.trim() !== (txn.merchant || '')) body.merchant = editMerchant.trim() || null
      if (editNotes.trim() !== (txn.notes || '')) body.notes = editNotes.trim() || null
      if (editDate && editDate !== txn.transaction_date?.slice(0, 10)) body.transaction_date = editDate
      if (editCategoryId !== txn.category_id) body.category_id = editCategoryId

      const updated = await apiFetch<TransactionDetail>(`/api/v1/transactions/${txn.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      setTxn(updated)
      populateEditFields(updated)
      setIsEditing(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel actualizar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (!txn) return
    Alert.alert('Eliminar', 'Tem a certeza que deseja eliminar esta transaccao?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(txn.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.back()
        },
      },
    ])
  }

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: tc.textMuted }]}>A carregar...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!txn) return null

  const availableCategories = getParentCategories(txn.type === 'transfer' ? undefined : txn.type)
  const categoryName = categories.find((c) => c.id === txn.category_id)?.name

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]}>Detalhe</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => { setIsEditing(!isEditing); if (isEditing && txn) populateEditFields(txn) }} style={styles.actionBtn}>
            <Ionicons name={isEditing ? 'close' : 'pencil'} size={20} color={text} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: card }]}>
          <Text style={[styles.typeLabel, txn.type === 'income' ? styles.income : styles.expense]}>
            {txn.type === 'income' ? 'Receita' : txn.type === 'expense' ? 'Despesa' : 'Transferencia'}
          </Text>
          {isEditing ? (
            <TextInput
              style={[styles.amountEdit, { color: text }]}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={muted}
            />
          ) : (
            <Text style={[styles.amount, { color: text }]}>
              {txn.type === 'income' ? '+' : '-'}{formatKz(txn.amount)}
            </Text>
          )}
          {!isEditing && (
            <Text style={[styles.date, { color: muted }]}>
              {formatDateFull(txn.transaction_date)}
            </Text>
          )}
        </View>

        {/* Edit form / Details */}
        <View style={[styles.detailCard, { backgroundColor: card }]}>
          {isEditing ? (
            <>
              {/* Description */}
              <EditField label="Descricao" isDark={isDark}>
                <TextInput
                  style={[styles.editInput, { borderColor: border, color: text }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Descricao"
                  placeholderTextColor={muted}
                />
              </EditField>

              {/* Date */}
              <EditField label="Data (AAAA-MM-DD)" isDark={isDark}>
                <TextInput
                  style={[styles.editInput, { borderColor: border, color: text }]}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="2026-04-12"
                  placeholderTextColor={muted}
                  keyboardType="numbers-and-punctuation"
                />
              </EditField>

              {/* Category */}
              <EditField label="Categoria" isDark={isDark}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  <Pressable
                    style={[
                      styles.catChip,
                      { borderColor: border },
                      !editCategoryId && { backgroundColor: accent },
                    ]}
                    onPress={() => setEditCategoryId(null)}
                  >
                    <Text style={[
                      styles.catChipText,
                      { color: !editCategoryId ? (isDark ? '#000' : '#fff') : muted },
                    ]}>
                      Nenhuma
                    </Text>
                  </Pressable>
                  {availableCategories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.catChip,
                        { borderColor: border },
                        editCategoryId === cat.id && { backgroundColor: accent },
                      ]}
                      onPress={() => setEditCategoryId(cat.id)}
                    >
                      <Text style={[
                        styles.catChipText,
                        { color: editCategoryId === cat.id ? (isDark ? '#000' : '#fff') : muted },
                      ]}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </EditField>

              {/* Merchant */}
              <EditField label="Comerciante" isDark={isDark}>
                <TextInput
                  style={[styles.editInput, { borderColor: border, color: text }]}
                  value={editMerchant}
                  onChangeText={setEditMerchant}
                  placeholder="Nome do comerciante"
                  placeholderTextColor={muted}
                />
              </EditField>

              {/* Notes */}
              <EditField label="Notas" isDark={isDark}>
                <TextInput
                  style={[styles.editInput, styles.editTextArea, { borderColor: border, color: text }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Notas adicionais"
                  placeholderTextColor={muted}
                  multiline
                  numberOfLines={3}
                />
              </EditField>

              {/* Save */}
              <Pressable
                style={[styles.saveBtn, { backgroundColor: accent }, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={[styles.saveBtnText, { color: isDark ? '#000' : '#fff' }]}>
                  {isSaving ? 'A guardar...' : 'Guardar alteracoes'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <DetailRow label="Descricao" value={txn.description || '—'} isDark={isDark} />
              <DetailRow label="Data" value={formatDateFull(txn.transaction_date)} isDark={isDark} />
              {categoryName && <DetailRow label="Categoria" value={categoryName} isDark={isDark} />}
              {txn.merchant && <DetailRow label="Comerciante" value={txn.merchant} isDark={isDark} />}
              {txn.notes && <DetailRow label="Notas" value={txn.notes} isDark={isDark} />}
              {txn.tags.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: muted }]}>Tags</Text>
                  <View style={styles.tagsRow}>
                    {txn.tags.map((tag) => (
                      <View key={tag} style={[styles.tag, { backgroundColor: tc.separator }]}>
                        <Text style={[styles.tagText, { color: muted }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              <DetailRow label="Recorrente" value={txn.is_recurring ? 'Sim' : 'Nao'} isDark={isDark} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function EditField({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  const tc = themeColors(isDark)
  return (
    <View style={styles.editFieldBlock}>
      <Text style={[styles.editFieldLabel, { color: tc.textSecondary }]}>{label}</Text>
      {children}
    </View>
  )
}

function DetailRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const tc = themeColors(isDark)
  return (
    <View style={[styles.detailRow, { borderBottomColor: tc.separator }]}>
      <Text style={[styles.detailLabel, { color: tc.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: tc.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  amountCard: { borderRadius: 16, padding: 24, alignItems: 'center' },
  typeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  amount: { fontSize: 36, fontWeight: '700', fontFamily: 'monospace' },
  amountEdit: {
    fontSize: 36, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 4,
  },
  date: { fontSize: 14, marginTop: 8 },
  detailCard: { borderRadius: 16, padding: 16 },
  detailRow: { paddingVertical: 12, borderBottomWidth: 0.5 },
  detailLabel: { fontSize: 12, marginBottom: 4 },
  detailValue: { fontSize: 15 },
  editFieldBlock: { marginBottom: 16 },
  editFieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  editInput: {
    fontSize: 15, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  editTextArea: { minHeight: 70, textAlignVertical: 'top' },
  catScroll: { marginBottom: 4 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, marginRight: 8,
  },
  catChipText: { fontSize: 13, fontWeight: '500' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12 },
  income: { color: colors.success },
  expense: { color: colors.error },
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
})
