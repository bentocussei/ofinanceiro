import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import IconDisplay from '../../components/common/IconDisplay'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { useAccountsStore } from '../../stores/accounts'
import { useGoalsStore } from '../../stores/goals'

const GOAL_TYPES = [
  { value: 'savings', label: 'Poupança' },
  { value: 'emergency_fund', label: 'Fundo emergência' },
  { value: 'purchase', label: 'Compra' },
  { value: 'travel', label: 'Viagem' },
  { value: 'event', label: 'Evento' },
  { value: 'education', label: 'Educação' },
  { value: 'custom', label: 'Outro' },
]

const AUTO_FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
]

export default function CreateGoalScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { createGoal } = useGoalsStore()
  const { accounts, fetchAccounts } = useAccountsStore()

  const [name, setName] = useState('')
  const [type, setType] = useState('savings')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [contributionFrequency, setContributionFrequency] = useState('monthly')
  const [targetDate, setTargetDate] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-contribution
  const [autoContribute, setAutoContribute] = useState(false)
  const [autoFrequency, setAutoFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly')
  const [autoDay, setAutoDay] = useState('')
  const [autoAmount, setAutoAmount] = useState('')
  const [autoAccountId, setAutoAccountId] = useState<string | null>(null)

  const CONTRIBUTION_FREQUENCIES = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' },
  ]

  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccounts().catch(() => {})
    }
  }, [accounts.length, fetchAccounts])

  const handleToggleAuto = (val: boolean) => {
    setAutoContribute(val)
    if (!val) {
      setAutoFrequency('monthly')
      setAutoDay('')
      setAutoAmount('')
      setAutoAccountId(null)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'O nome é obrigatório'); return }
    if (!targetAmount || parseFloat(targetAmount) <= 0) { Alert.alert('Erro', 'Defina o valor alvo'); return }

    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
        target_amount: Math.round(parseFloat(targetAmount) * 100),
        target_date: targetDate.trim() || undefined,
        monthly_contribution: monthlyContribution ? Math.round(parseFloat(monthlyContribution) * 100) : undefined,
        contribution_frequency: contributionFrequency,
        description: description.trim() || undefined,
        auto_contribute: autoContribute,
      }

      if (autoContribute) {
        payload.contribution_frequency = autoFrequency
        const dayNum = parseInt(autoDay, 10)
        if (!isNaN(dayNum)) payload.contribution_day = dayNum
        if (autoAmount) payload.contribution_amount = Math.round(parseFloat(autoAmount) * 100)
        if (autoAccountId) payload.contribution_account_id = autoAccountId
      }

      await createGoal(payload)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar a meta')
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
        <Text style={[styles.title, isDark && styles.textLight]}>Nova meta</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, isDark && styles.textMuted]}>Nome da meta</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: Férias em Cabo Verde"
          placeholderTextColor={colors.light.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Tipo</Text>
        <View style={styles.typeGrid}>
          {GOAL_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.typeChip, isDark && styles.typeChipDark, type === t.value && styles.typeSelected]}
              onPress={() => setType(t.value)}
            >
              <IconDisplay name={t.value} size={20} color={type === t.value ? colors.primary : colors.light.textSecondary} />
              <Text style={[styles.typeLabel, type === t.value && styles.typeLabelSelected]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, isDark && styles.textMuted]}>Valor alvo (Kz)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor={colors.light.textMuted}
          keyboardType="numeric"
          value={targetAmount}
          onChangeText={setTargetAmount}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Data alvo (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.light.textMuted}
          value={targetDate}
          onChangeText={setTargetDate}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Descreva o objectivo desta meta..."
          placeholderTextColor={colors.light.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Valor da contribuição (Kz, opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor={colors.light.textMuted}
          keyboardType="numeric"
          value={monthlyContribution}
          onChangeText={setMonthlyContribution}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Frequência da contribuição</Text>
        <View style={styles.typeGrid}>
          {CONTRIBUTION_FREQUENCIES.map((f) => (
            <Pressable
              key={f.value}
              style={[styles.typeChip, isDark && styles.typeChipDark, contributionFrequency === f.value && styles.typeSelected]}
              onPress={() => setContributionFrequency(f.value)}
            >
              <Text style={[styles.typeLabel, contributionFrequency === f.value && styles.typeLabelSelected]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Auto-contribution section */}
        <Text style={[styles.label, isDark && styles.textMuted]}>Contribuição automática</Text>
        <View style={[styles.autoCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <View style={styles.autoToggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.autoTitle, { color: tc.text }]}>Contribuição automática</Text>
              <Text style={[styles.autoDescription, { color: tc.textMuted }]}>
                Configure pagamentos automáticos regulares para esta meta
              </Text>
            </View>
            <Switch
              value={autoContribute}
              onValueChange={handleToggleAuto}
              trackColor={{ false: colors.light.separator, true: colors.primary }}
              thumbColor={colors.dark.text}
            />
          </View>

          {autoContribute && (
            <View style={styles.autoFields}>
              <Text style={[styles.label, isDark && styles.textMuted]}>Frequência</Text>
              <View style={styles.chipRow}>
                {AUTO_FREQUENCIES.map((f) => (
                  <Pressable
                    key={f.value}
                    style={[styles.chip, isDark && styles.typeChipDark, autoFrequency === f.value && styles.typeSelected]}
                    onPress={() => setAutoFrequency(f.value as 'weekly' | 'biweekly' | 'monthly')}
                  >
                    <Text style={[styles.typeLabel, autoFrequency === f.value && styles.typeLabelSelected]}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, isDark && styles.textMuted]}>Dia de contribuição</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="15"
                placeholderTextColor={colors.light.textMuted}
                keyboardType="numeric"
                value={autoDay}
                onChangeText={setAutoDay}
              />
              <Text style={[styles.helper, { color: tc.textMuted }]}>
                Dia do mês (ex: 15) ou dia da semana (1-7)
              </Text>

              <Text style={[styles.label, isDark && styles.textMuted]}>Valor da contribuição (Kz)</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="0"
                placeholderTextColor={colors.light.textMuted}
                keyboardType="numeric"
                value={autoAmount}
                onChangeText={setAutoAmount}
              />
              <Text style={[styles.helper, { color: tc.textMuted }]}>
                Quanto será poupado em cada contribuição
              </Text>

              <Text style={[styles.label, isDark && styles.textMuted]}>Conta de origem</Text>
              {accounts.length === 0 ? (
                <Text style={[styles.helper, { color: tc.textMuted }]}>Sem contas disponíveis</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {accounts.filter((a) => !a.is_archived).map((acc) => (
                    <Pressable
                      key={acc.id}
                      style={[styles.chip, isDark && styles.typeChipDark, autoAccountId === acc.id && styles.typeSelected]}
                      onPress={() => setAutoAccountId(autoAccountId === acc.id ? null : acc.id)}
                    >
                      <Text style={[styles.typeLabel, autoAccountId === acc.id && styles.typeLabelSelected]} numberOfLines={1}>
                        {acc.name}
                      </Text>
                      <Text style={[styles.chipBalance, { color: tc.textMuted }]} numberOfLines={1}>
                        {formatKz(acc.balance)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        <Pressable
          style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>{isSubmitting ? 'A criar...' : 'Criar meta'}</Text>
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
  helper: { fontSize: 11, marginTop: 4, color: colors.light.textMuted },
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
  typeIcon: { fontSize: 20, marginBottom: 2 },
  typeLabel: { fontSize: 11, color: colors.light.textSecondary },
  typeLabelSelected: { color: colors.primary, fontWeight: '600' },
  autoCard: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 4,
  },
  autoToggleRow: { flexDirection: 'row', alignItems: 'center' },
  autoTitle: { fontSize: 14, fontWeight: '600' },
  autoDescription: { fontSize: 12, marginTop: 2 },
  autoFields: { marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    borderColor: colors.light.border, backgroundColor: colors.light.card, minWidth: 80,
    alignItems: 'center',
  },
  chipBalance: { fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  submitBtn: { backgroundColor: colors.light.text, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.dark.text, fontSize: 16, fontWeight: '600' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
})
