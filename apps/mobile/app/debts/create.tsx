import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useDebtsStore } from '../../stores/debts'

const DEBT_TYPES = [
  { value: 'personal_loan', label: 'Empréstimo pessoal' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'mortgage', label: 'Hipoteca' },
  { value: 'car_loan', label: 'Automóvel' },
  { value: 'student_loan', label: 'Estudantil' },
  { value: 'other', label: 'Outro' },
]

const NATURES = [
  { value: 'formal', label: 'Formal' },
  { value: 'informal', label: 'Informal' },
]

const CREDITOR_TYPES = [
  { value: 'bank', label: 'Banco' },
  { value: 'institution', label: 'Instituição' },
  { value: 'person', label: 'Pessoa' },
  { value: 'company', label: 'Empresa' },
  { value: 'other', label: 'Outro' },
]

export default function CreateDebtScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { createDebt } = useDebtsStore()

  const [name, setName] = useState('')
  const [type, setType] = useState('personal_loan')
  const [creditor, setCreditor] = useState('')
  const [originalAmount, setOriginalAmount] = useState('')
  const [currentBalance, setCurrentBalance] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [nature, setNature] = useState('formal')
  const [creditorType, setCreditorType] = useState('bank')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'O nome e obrigatorio'); return }
    if (!originalAmount || parseFloat(originalAmount) <= 0) { Alert.alert('Erro', 'Defina o montante original'); return }
    if (!currentBalance || parseFloat(currentBalance) < 0) { Alert.alert('Erro', 'Defina o saldo actual'); return }

    setIsSubmitting(true)
    try {
      await createDebt({
        name: name.trim(),
        type,
        creditor: creditor.trim() || undefined,
        original_amount: Math.round(parseFloat(originalAmount) * 100),
        current_balance: Math.round(parseFloat(currentBalance) * 100),
        interest_rate: interestRate ? parseFloat(interestRate) : undefined,
        monthly_payment: monthlyPayment ? Math.round(parseFloat(monthlyPayment) * 100) : undefined,
        nature,
        creditor_type: creditorType,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel criar a divida')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Nova divida</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, isDark && styles.textMuted]}>Nome</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: Emprestimo bancario"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Tipo</Text>
        <View style={styles.typeGrid}>
          {DEBT_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.typeChip, isDark && styles.typeChipDark, type === t.value && styles.typeSelected]}
              onPress={() => setType(t.value)}
            >
              <Text style={[styles.typeLabel, type === t.value && styles.typeLabelSelected]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, isDark && styles.textMuted]}>Natureza</Text>
        <View style={styles.typeGrid}>
          {NATURES.map((n) => (
            <Pressable
              key={n.value}
              style={[styles.typeChip, isDark && styles.typeChipDark, nature === n.value && styles.typeSelected]}
              onPress={() => setNature(n.value)}
            >
              <Text style={[styles.typeLabel, nature === n.value && styles.typeLabelSelected]}>{n.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, isDark && styles.textMuted]}>Tipo de credor</Text>
        <View style={styles.typeGrid}>
          {CREDITOR_TYPES.map((ct) => (
            <Pressable
              key={ct.value}
              style={[styles.typeChip, isDark && styles.typeChipDark, creditorType === ct.value && styles.typeSelected]}
              onPress={() => setCreditorType(ct.value)}
            >
              <Text style={[styles.typeLabel, creditorType === ct.value && styles.typeLabelSelected]}>{ct.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, isDark && styles.textMuted]}>Credor (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: Banco BAI"
          placeholderTextColor="#999"
          value={creditor}
          onChangeText={setCreditor}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Montante original (Kz)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={originalAmount}
          onChangeText={setOriginalAmount}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Saldo actual (Kz)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={currentBalance}
          onChangeText={setCurrentBalance}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Taxa de juro (%, opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={interestRate}
          onChangeText={setInterestRate}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Pagamento mensal (Kz, opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={monthlyPayment}
          onChangeText={setMonthlyPayment}
        />

        <Pressable
          style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>{isSubmitting ? 'A criar...' : 'Criar divida'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#000', backgroundColor: '#fff',
  },
  inputDark: { borderColor: '#333', backgroundColor: '#111', color: '#fff' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e5e5', minWidth: 80, backgroundColor: '#fff',
  },
  typeChipDark: { borderColor: '#333', backgroundColor: '#1a1a1a' },
  typeSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  typeLabel: { fontSize: 11, color: '#666' },
  typeLabelSelected: { color: '#3b82f6', fontWeight: '600' },
  submitBtn: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
