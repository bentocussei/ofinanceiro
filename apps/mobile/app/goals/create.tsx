import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import IconDisplay from '../../components/common/IconDisplay'
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

export default function CreateGoalScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { createGoal } = useGoalsStore()

  const [name, setName] = useState('')
  const [type, setType] = useState('savings')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [contributionFrequency, setContributionFrequency] = useState('monthly')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const CONTRIBUTION_FREQUENCIES = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' },
  ]

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'O nome é obrigatório'); return }
    if (!targetAmount || parseFloat(targetAmount) <= 0) { Alert.alert('Erro', 'Defina o valor alvo'); return }

    setIsSubmitting(true)
    try {
      await createGoal({
        name: name.trim(),
        type,
        target_amount: Math.round(parseFloat(targetAmount) * 100),
        monthly_contribution: monthlyContribution ? Math.round(parseFloat(monthlyContribution) * 100) : undefined,
        contribution_frequency: contributionFrequency,
        description: description.trim() || undefined,
      })
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
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Nova meta</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, isDark && styles.textMuted]}>Nome da meta</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: Férias em Cabo Verde"
          placeholderTextColor="#999"
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
              <IconDisplay name={t.value} size={20} color={type === t.value ? '#3b82f6' : '#666'} />
              <Text style={[styles.typeLabel, type === t.value && styles.typeLabelSelected]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, isDark && styles.textMuted]}>Valor alvo (Kz)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={targetAmount}
          onChangeText={setTargetAmount}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Descreva o objectivo desta meta..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, isDark && styles.textMuted]}>Valor da contribuição (Kz, opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="0"
          placeholderTextColor="#999"
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
  typeIcon: { fontSize: 20, marginBottom: 2 },
  typeLabel: { fontSize: 11, color: '#666' },
  typeLabelSelected: { color: '#3b82f6', fontWeight: '600' },
  submitBtn: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
