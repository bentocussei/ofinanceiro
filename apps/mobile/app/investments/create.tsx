import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, themeColors } from '../../lib/tokens'
import { useInvestmentsStore } from '../../stores/investments'

const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Ações' },
  { value: 'bonds', label: 'Obrigacoes' },
  { value: 'real_estate', label: 'Imóveis' },
  { value: 'mutual_fund', label: 'Fundo mutuo' },
  { value: 'crypto', label: 'Criptomoedas' },
  { value: 'fixed_deposit', label: 'Depósito a prazo' },
  { value: 'other', label: 'Outro' },
]

export default function CreateInvestmentScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { createInvestment } = useInvestmentsStore()

  const [name, setName] = useState('')
  const [type, setType] = useState('fixed_deposit')
  const [institution, setInstitution] = useState('')
  const [investedAmount, setInvestedAmount] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [maturityDate, setMaturityDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'O nome e obrigatório'); return }
    if (!investedAmount || parseFloat(investedAmount) <= 0) { Alert.alert('Erro', 'Defina o montante investido'); return }
    if (!currentValue || parseFloat(currentValue) < 0) { Alert.alert('Erro', 'Defina o valor actual'); return }

    setIsSubmitting(true)
    try {
      await createInvestment({
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        invested_amount: Math.round(parseFloat(investedAmount) * 100),
        current_value: Math.round(parseFloat(currentValue) * 100),
        interest_rate: interestRate ? parseFloat(interestRate) : undefined,
        start_date: startDate.trim() || undefined,
        maturity_date: maturityDate.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar o investimento')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Novo investimento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, isDark && styles.textMuted]}>Nome</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: Depósito BAI"
          placeholderTextColor={colors.light.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Tipo</Text>
        <View style={styles.typeGrid}>
          {INVESTMENT_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.typeChip, isDark && styles.typeChipDark, type === t.value && styles.typeSelected]}
              onPress={() => setType(t.value)}
            >
              <Text style={[styles.typeLabel, type === t.value && styles.typeLabelSelected]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, isDark && styles.textMuted]}>Instituicao (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: Banco BAI"
          placeholderTextColor={colors.light.textMuted}
          value={institution}
          onChangeText={setInstitution}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Montante investido (Kz)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor={colors.light.textMuted}
          keyboardType="numeric"
          value={investedAmount}
          onChangeText={setInvestedAmount}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Valor actual (Kz)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor={colors.light.textMuted}
          keyboardType="numeric"
          value={currentValue}
          onChangeText={setCurrentValue}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Taxa de juro (%, opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor={colors.light.textMuted}
          keyboardType="numeric"
          value={interestRate}
          onChangeText={setInterestRate}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Data de início (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.light.textMuted}
          value={startDate}
          onChangeText={setStartDate}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Data de maturidade (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.light.textMuted}
          value={maturityDate}
          onChangeText={setMaturityDate}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark, { height: 60, textAlignVertical: 'top' }]}
          placeholder="Observações"
          placeholderTextColor={colors.light.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Pressable
          style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>{isSubmitting ? 'A criar...' : 'Criar investimento'}</Text>
        </Pressable>
      </ScrollView>
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
  title: { fontSize: 20, fontWeight: '700', color: colors.light.text },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: colors.light.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: colors.light.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.light.text, backgroundColor: colors.light.card,
  },
  inputDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.input, color: colors.dark.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.light.border, minWidth: 80, backgroundColor: colors.light.card,
  },
  typeChipDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.card },
  typeSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeLabel: { fontSize: 11, color: colors.light.textSecondary },
  typeLabelSelected: { color: colors.primary, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.light.text, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.dark.text, fontSize: 16, fontWeight: '600' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
})
