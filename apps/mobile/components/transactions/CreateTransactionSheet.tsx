import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'

import AmountInput from '../common/AmountInput'
import IconDisplay from '../common/IconDisplay'
import { apiFetch } from '../../lib/api'
import { useAccountsStore } from '../../stores/accounts'
import { useCategoriesStore } from '../../stores/categories'
import { useTransactionsStore } from '../../stores/transactions'

interface Tag {
  id: string
  name: string
  color?: string
}

interface Props {
  onCreated?: () => void
}

const CreateTransactionSheet = forwardRef<BottomSheet, Props>(({ onCreated }, ref) => {
  const isDark = useColorScheme() === 'dark'
  const snapPoints = useMemo(() => ['92%'], [])
  const { accounts } = useAccountsStore()
  const { fetchCategories, getParentCategories } = useCategoriesStore()
  const { createTransaction } = useTransactionsStore()
  const clientIdRef = useRef<string>('')

  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Tags
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    fetchCategories()
    apiFetch<Tag[]>('/api/v1/tags/').then(setTags).catch(() => {})
  }, [])

  const parentCategories = getParentCategories(type)
  const activeAccount = selectedAccount || accounts[0]?.id

  const reset = () => {
    setAmount('')
    setType('expense')
    setDescription('')
    setMerchant('')
    setDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setSelectedAccount(null)
    setSelectedCategory(null)
    setSelectedTags([])
    setIsPrivate(false)
    setNeedsReview(false)
    setShowAdvanced(false)
    clientIdRef.current = ''
  }

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Introduza um valor valido')
      return
    }
    if (!activeAccount) {
      Alert.alert('Erro', 'Crie uma conta primeiro')
      return
    }

    // Idempotency
    if (!clientIdRef.current) {
      clientIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }

    setIsSubmitting(true)
    try {
      const amountCentavos = Math.round(parseFloat(amount.replace(/[^\d.]/g, '')) * 100)
      await createTransaction({
        account_id: activeAccount,
        amount: amountCentavos,
        type,
        description: description.trim() || undefined,
        merchant: merchant.trim() || undefined,
        transaction_date: date || undefined,
        notes: notes.trim() || undefined,
        category_id: selectedCategory || undefined,
        tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
        is_private: isPrivate || undefined,
        needs_review: needsReview || undefined,
        client_id: clientIdRef.current,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      reset()
      ;(ref as any)?.current?.close()
      onCreated?.()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel registar a transaccao')
    } finally {
      setIsSubmitting(false)
    }
  }, [amount, type, description, merchant, date, notes, activeAccount, selectedCategory, selectedTags, isPrivate, needsReview])

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const bg = isDark ? '#1a1a1a' : '#fff'
  const inputBg = isDark ? '#111' : '#f9f9f9'
  const border = isDark ? '#333' : '#e5e5e5'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#999' : '#666'

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: bg }}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#666' : '#ccc' }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: text }]}>Nova transaccao</Text>

        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <Pressable
            style={[styles.typeBtn, { borderColor: border }, type === 'expense' && styles.expenseActive]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
              Despesa
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, { borderColor: border }, type === 'income' && styles.incomeActive]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>
              Receita
            </Text>
          </Pressable>
        </View>

        {/* Amount */}
        <AmountInput value={amount} onChange={setAmount} />

        {/* Description */}
        <Text style={[styles.label, { color: muted }]}>Descricao</Text>
        <TextInput
          style={[styles.input, { borderColor: border, backgroundColor: inputBg, color: text }]}
          placeholder="Ex: Almoco no restaurante"
          placeholderTextColor={muted}
          value={description}
          onChangeText={setDescription}
        />

        {/* Merchant */}
        <Text style={[styles.label, { color: muted }]}>Estabelecimento</Text>
        <TextInput
          style={[styles.input, { borderColor: border, backgroundColor: inputBg, color: text }]}
          placeholder="Ex: Kero, Candando"
          placeholderTextColor={muted}
          value={merchant}
          onChangeText={setMerchant}
        />

        {/* Date */}
        <Text style={[styles.label, { color: muted }]}>Data</Text>
        <TextInput
          style={[styles.input, { borderColor: border, backgroundColor: inputBg, color: text }]}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={muted}
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
        />

        {/* Account Picker */}
        {accounts.length > 1 && (
          <>
            <Text style={[styles.label, { color: muted }]}>Conta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {accounts.map((acc) => (
                  <Pressable
                    key={acc.id}
                    style={[
                      styles.chip,
                      { borderColor: border },
                      (selectedAccount || accounts[0]?.id) === acc.id && styles.chipSelected,
                    ]}
                    onPress={() => setSelectedAccount(acc.id)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: muted },
                      (selectedAccount || accounts[0]?.id) === acc.id && styles.chipTextSelected,
                    ]}>
                      {acc.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Categories */}
        <Text style={[styles.label, { color: muted }]}>Categoria</Text>
        <View style={styles.categoryGrid}>
          {parentCategories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                { borderColor: border },
                selectedCategory === cat.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              <IconDisplay name={cat.name} size={18} color={selectedCategory === cat.id ? '#3b82f6' : muted} />
              <Text style={[
                styles.categoryLabel,
                { color: muted },
                selectedCategory === cat.id && styles.chipTextSelected,
              ]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Advanced toggle */}
        <Pressable
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={[styles.advancedText, { color: muted }]}>
            {showAdvanced ? 'Menos opcoes' : 'Mais opcoes'}
          </Text>
        </Pressable>

        {showAdvanced && (
          <>
            {/* Notes */}
            <Text style={[styles.label, { color: muted }]}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: border, backgroundColor: inputBg, color: text }]}
              placeholder="Notas adicionais..."
              placeholderTextColor={muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            {/* Tags */}
            {tags.length > 0 && (
              <>
                <Text style={[styles.label, { color: muted }]}>Etiquetas</Text>
                <View style={styles.chipRow}>
                  {tags.map((tag) => (
                    <Pressable
                      key={tag.id}
                      style={[
                        styles.chip,
                        { borderColor: border },
                        selectedTags.includes(tag.id) && styles.chipSelected,
                      ]}
                      onPress={() => toggleTag(tag.id)}
                    >
                      {tag.color && (
                        <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                      )}
                      <Text style={[
                        styles.chipText,
                        { color: muted },
                        selectedTags.includes(tag.id) && styles.chipTextSelected,
                      ]}>
                        {tag.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Flags */}
            <View style={styles.flagRow}>
              <View style={styles.flagItem}>
                <Text style={[styles.flagLabel, { color: text }]}>Privada</Text>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: isDark ? '#333' : '#e5e5e5', true: '#3b82f6' }}
                />
              </View>
              <View style={styles.flagItem}>
                <Text style={[styles.flagLabel, { color: text }]}>Necessita revisao</Text>
                <Switch
                  value={needsReview}
                  onValueChange={setNeedsReview}
                  trackColor={{ false: isDark ? '#333' : '#e5e5e5', true: '#f59e0b' }}
                />
              </View>
            </View>
          </>
        )}

        {/* Submit */}
        <Pressable
          style={[
            styles.submitBtn,
            type === 'income' ? styles.submitIncome : styles.submitExpense,
            isSubmitting && styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>
            {isSubmitting
              ? 'A registar...'
              : type === 'expense'
                ? 'Registar despesa'
                : 'Registar receita'}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

CreateTransactionSheet.displayName = 'CreateTransactionSheet'
export default CreateTransactionSheet

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1,
  },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: '#999' },
  typeBtnTextActive: { color: '#fff' },
  expenseActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  incomeActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  chipSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13 },
  chipTextSelected: { color: '#3b82f6', fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, minWidth: 70,
  },
  categoryLabel: { fontSize: 10, marginTop: 2 },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  advancedToggle: { alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  advancedText: { fontSize: 13, fontWeight: '500' },
  flagRow: { marginTop: 12, gap: 12 },
  flagItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flagLabel: { fontSize: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitExpense: { backgroundColor: '#ef4444' },
  submitIncome: { backgroundColor: '#22c55e' },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
