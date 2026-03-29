import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'

import AmountInput from '../common/AmountInput'
import { useAccountsStore } from '../../stores/accounts'
import { useCategoriesStore } from '../../stores/categories'
import { useTransactionsStore } from '../../stores/transactions'

interface Props {
  onCreated?: () => void
}

const CreateTransactionSheet = forwardRef<BottomSheet, Props>(({ onCreated }, ref) => {
  const isDark = useColorScheme() === 'dark'
  const snapPoints = useMemo(() => ['90%'], [])
  const { accounts } = useAccountsStore()
  const { categories, fetchCategories, getParentCategories } = useCategoriesStore()
  const { createTransaction } = useTransactionsStore()

  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [description, setDescription] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const parentCategories = getParentCategories(type)

  const activeAccount = selectedAccount || accounts[0]?.id

  const reset = () => {
    setAmount('')
    setType('expense')
    setDescription('')
    setSelectedAccount(null)
    setSelectedCategory(null)
  }

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Introduza um valor válido')
      return
    }
    if (!activeAccount) {
      Alert.alert('Erro', 'Crie uma conta primeiro')
      return
    }

    setIsSubmitting(true)
    try {
      const amountCentavos = Math.round(parseFloat(amount.replace(/[^\d.]/g, '')) * 100)
      await createTransaction({
        account_id: activeAccount,
        amount: amountCentavos,
        type,
        description: description.trim() || undefined,
        category_id: selectedCategory || undefined,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      reset()
      ;(ref as any)?.current?.close()
      onCreated?.()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível registar a transacção')
    } finally {
      setIsSubmitting(false)
    }
  }, [amount, type, description, activeAccount])

  const inputStyle = [styles.input, isDark && styles.inputDark]

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={isDark ? styles.sheetDark : styles.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#666' : '#ccc' }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, isDark && styles.textLight]}>Nova transacção</Text>

        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <Pressable
            style={[styles.typeBtn, type === 'expense' && styles.expenseActive]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
              Despesa
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, type === 'income' && styles.incomeActive]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>
              Receita
            </Text>
          </Pressable>
        </View>

        {/* Amount — custom numeric keypad */}
        <AmountInput value={amount} onChange={setAmount} />

        {/* Description */}
        <Text style={[styles.label, isDark && styles.textMuted]}>Descrição</Text>
        <TextInput
          style={inputStyle}
          placeholder="Ex: Almoço no restaurante"
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
        />

        {/* Account Picker */}
        {accounts.length > 1 && (
          <>
            <Text style={[styles.label, isDark && styles.textMuted]}>Conta</Text>
            <View style={styles.accountPicker}>
              {accounts.map((acc) => (
                <Pressable
                  key={acc.id}
                  style={[
                    styles.accountChip,
                    isDark && styles.accountChipDark,
                    (selectedAccount || accounts[0]?.id) === acc.id && styles.accountChipSelected,
                  ]}
                  onPress={() => setSelectedAccount(acc.id)}
                >
                  <Text style={styles.accountChipIcon}>{acc.icon || '💰'}</Text>
                  <Text
                    style={[
                      styles.accountChipText,
                      (selectedAccount || accounts[0]?.id) === acc.id && styles.accountChipTextSelected,
                    ]}
                  >
                    {acc.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Categories from API */}
        <Text style={[styles.label, isDark && styles.textMuted]}>Categoria (opcional)</Text>
        <View style={styles.categoryGrid}>
          {parentCategories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                isDark && styles.categoryChipDark,
                selectedCategory === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => {
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                fetchCategories()
              }}
            >
              <Text style={styles.categoryIcon}>{cat.icon || '📦'}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  isDark && styles.textMuted,
                  selectedCategory === cat.id && styles.categoryLabelSelected,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </View>

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
  sheet: { backgroundColor: '#fff' },
  sheetDark: { backgroundColor: '#1a1a1a' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#000' },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#000', backgroundColor: '#f9f9f9',
  },
  inputDark: { borderColor: '#333', backgroundColor: '#111', color: '#fff' },
  amountInput: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 16, fontSize: 28, fontWeight: '700',
    fontFamily: 'monospace', color: '#000', backgroundColor: '#f9f9f9', textAlign: 'right',
  },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e5e5',
  },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: '#999' },
  typeBtnTextActive: { color: '#fff' },
  expenseActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  incomeActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  accountPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e5e5',
  },
  accountChipDark: { borderColor: '#333' },
  accountChipSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  accountChipIcon: { fontSize: 14 },
  accountChipText: { fontSize: 13, color: '#666' },
  accountChipTextSelected: { color: '#3b82f6', fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', minWidth: 70,
  },
  categoryChipDark: { borderColor: '#333' },
  categoryChipSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  categoryIcon: { fontSize: 20, marginBottom: 2 },
  categoryLabel: { fontSize: 10, color: '#666' },
  categoryLabelSelected: { color: '#3b82f6', fontWeight: '600' },
  submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitExpense: { backgroundColor: '#ef4444' },
  submitIncome: { backgroundColor: '#22c55e' },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
