import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { useAccountsStore } from '../../stores/accounts'

interface GoalDetail {
  id: string
  name: string
  type: string
  target_amount: number
  current_amount: number
  monthly_contribution: number | null
  status: string
  auto_contribute?: boolean | null
  contribution_frequency?: string | null
  contribution_day?: number | null
  contribution_amount?: number | null
  contribution_account_id?: string | null
}

const AUTO_FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
]

interface GoalProgress {
  percentage: number
  remaining: number
  months_remaining: number | null
  contributions: { amount: number; note: string | null; contributed_at: string }[]
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)

  const { accounts, fetchAccounts } = useAccountsStore()

  const [goal, setGoal] = useState<GoalDetail | null>(null)
  const [progress, setProgress] = useState<GoalProgress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [contributeAmount, setContributeAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isContributing, setIsContributing] = useState(false)

  // Auto-contribute state (edit mode)
  const [autoContribute, setAutoContribute] = useState(false)
  const [autoFrequency, setAutoFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly')
  const [autoDay, setAutoDay] = useState('')
  const [autoAmount, setAutoAmount] = useState('')
  const [autoAccountId, setAutoAccountId] = useState<string | null>(null)

  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccounts().catch(() => {})
    }
  }, [accounts.length, fetchAccounts])

  const fetchData = async () => {
    if (!id) return
    try {
      const [goalData, progressData] = await Promise.all([
        apiFetch<GoalDetail>(`/api/v1/goals/${id}`),
        apiFetch<GoalProgress>(`/api/v1/goals/${id}/progress`),
      ])
      setGoal(goalData)
      setProgress(progressData)
      setEditName(goalData.name)
      setEditTarget(String(goalData.target_amount / 100))
      setAutoContribute(!!goalData.auto_contribute)
      const freq = (goalData.contribution_frequency ?? 'monthly') as string
      setAutoFrequency(
        freq === 'weekly' || freq === 'biweekly' || freq === 'monthly'
          ? (freq as 'weekly' | 'biweekly' | 'monthly')
          : 'monthly',
      )
      setAutoDay(goalData.contribution_day != null ? String(goalData.contribution_day) : '')
      setAutoAmount(goalData.contribution_amount != null ? String(goalData.contribution_amount / 100) : '')
      setAutoAccountId(goalData.contribution_account_id ?? null)
      setIsLoading(false)
    } catch {
      setIsLoading(false)
      Alert.alert('Erro', 'Meta não encontrada')
      router.back()
    }
  }

  const handleToggleAuto = (val: boolean) => {
    setAutoContribute(val)
    if (!val) {
      setAutoDay('')
      setAutoAmount('')
      setAutoAccountId(null)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleSave = async () => {
    if (!goal) return
    setIsSaving(true)
    try {
      const updates: Record<string, unknown> = {}
      if (editName.trim() !== goal.name) updates.name = editName.trim()
      const newTarget = Math.round(parseFloat(editTarget) * 100)
      if (newTarget > 0 && newTarget !== goal.target_amount) updates.target_amount = newTarget

      // Auto-contribution fields always sent when editing so changes persist
      updates.auto_contribute = autoContribute
      if (autoContribute) {
        updates.contribution_frequency = autoFrequency
        const dayNum = parseInt(autoDay, 10)
        updates.contribution_day = !isNaN(dayNum) ? dayNum : null
        updates.contribution_amount = autoAmount ? Math.round(parseFloat(autoAmount) * 100) : null
        updates.contribution_account_id = autoAccountId || null
      } else {
        updates.contribution_day = null
        updates.contribution_amount = null
        updates.contribution_account_id = null
      }

      await apiFetch(`/api/v1/goals/${goal.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      setIsEditing(false)
      await fetchData()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível actualizar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleContribute = async () => {
    if (!goal || !contributeAmount) return
    setIsContributing(true)
    try {
      await apiFetch(`/api/v1/goals/${goal.id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount: Math.round(parseFloat(contributeAmount) * 100) }),
      })
      setContributeAmount('')
      await fetchData()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível contribuir')
    } finally {
      setIsContributing(false)
    }
  }

  const handleDelete = () => {
    if (!goal) return
    Alert.alert('Eliminar', `Tem a certeza que deseja eliminar a meta "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/v1/goals/${goal.id}`, { method: 'DELETE' })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível eliminar')
          }
        },
      },
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, isDark && styles.textMuted]}>A carregar...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!goal) return null

  const pct = goal.target_amount > 0 ? Math.round(goal.current_amount / goal.target_amount * 100) : 0
  const isComplete = goal.status === 'completed'

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>Meta</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setIsEditing(!isEditing)} style={styles.actionBtn}>
            <Ionicons name={isEditing ? 'close' : 'pencil'} size={20} color={tc.text} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Name + Edit */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          {isEditing ? (
            <View style={{ gap: 12 }}>
              <TextInput
                style={[styles.editInput, isDark && styles.editInputDark]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome da meta"
                placeholderTextColor={colors.light.textMuted}
              />
              <TextInput
                style={[styles.editInput, isDark && styles.editInputDark]}
                value={editTarget}
                onChangeText={setEditTarget}
                placeholder="Valor alvo (Kz)"
                placeholderTextColor={colors.light.textMuted}
                keyboardType="numeric"
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.goalName, isDark && styles.textLight]}>{goal.name}</Text>
              {isComplete && (
                <Text style={styles.completedLabel}>Concluida</Text>
              )}
            </View>
          )}
        </View>

        {/* Auto-contribution (edit mode) */}
        {isEditing && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.autoToggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.autoTitle, { color: tc.text }]}>Contribuicao automática</Text>
                <Text style={[styles.autoDescription, { color: tc.textMuted }]}>
                  Configure pagamentos automaticos regulares para esta meta
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
                <Text style={[styles.fieldLabel, { color: tc.textMuted }]}>Frequência</Text>
                <View style={styles.chipRow}>
                  {AUTO_FREQUENCIES.map((f) => (
                    <Pressable
                      key={f.value}
                      style={[
                        styles.chip,
                        isDark && styles.chipDark,
                        autoFrequency === f.value && styles.chipSelected,
                      ]}
                      onPress={() => setAutoFrequency(f.value as 'weekly' | 'biweekly' | 'monthly')}
                    >
                      <Text style={[styles.chipLabel, autoFrequency === f.value && styles.chipLabelSelected]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: tc.textMuted }]}>Dia de contribuicao</Text>
                <TextInput
                  style={[styles.fieldInput, isDark && styles.editInputDark]}
                  placeholder="15"
                  placeholderTextColor={colors.light.textMuted}
                  keyboardType="numeric"
                  value={autoDay}
                  onChangeText={setAutoDay}
                />
                <Text style={[styles.helper, { color: tc.textMuted }]}>
                  Dia do mês (ex: 15) ou dia da semana (1-7)
                </Text>

                <Text style={[styles.fieldLabel, { color: tc.textMuted }]}>Valor da contribuicao (Kz)</Text>
                <TextInput
                  style={[styles.fieldInput, isDark && styles.editInputDark]}
                  placeholder="0"
                  placeholderTextColor={colors.light.textMuted}
                  keyboardType="numeric"
                  value={autoAmount}
                  onChangeText={setAutoAmount}
                />
                <Text style={[styles.helper, { color: tc.textMuted }]}>
                  Quanto será poupado em cada contribuicao
                </Text>

                <Text style={[styles.fieldLabel, { color: tc.textMuted }]}>Conta de origem</Text>
                {accounts.length === 0 ? (
                  <Text style={[styles.helper, { color: tc.textMuted }]}>Sem contas disponíveis</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {accounts.filter((a) => !a.is_archived).map((acc) => (
                      <Pressable
                        key={acc.id}
                        style={[
                          styles.chip,
                          isDark && styles.chipDark,
                          autoAccountId === acc.id && styles.chipSelected,
                        ]}
                        onPress={() => setAutoAccountId(autoAccountId === acc.id ? null : acc.id)}
                      >
                        <Text
                          style={[styles.chipLabel, autoAccountId === acc.id && styles.chipLabelSelected]}
                          numberOfLines={1}
                        >
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
        )}

        {/* Auto-contribution summary (read-only) */}
        {!isEditing && goal.auto_contribute && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>Contribuicao automática</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: tc.textMuted }]}>Frequência</Text>
              <Text style={[styles.summaryValue, isDark && styles.textLight]}>
                {goal.contribution_frequency === 'weekly'
                  ? 'Semanal'
                  : goal.contribution_frequency === 'biweekly'
                    ? 'Quinzenal'
                    : 'Mensal'}
              </Text>
            </View>
            {goal.contribution_day != null && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: tc.textMuted }]}>Dia</Text>
                <Text style={[styles.summaryValue, isDark && styles.textLight]}>{goal.contribution_day}</Text>
              </View>
            )}
            {goal.contribution_amount != null && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: tc.textMuted }]}>Valor</Text>
                <Text style={[styles.summaryValue, isDark && styles.textLight]}>
                  {formatKz(goal.contribution_amount)}
                </Text>
              </View>
            )}
            {goal.contribution_account_id && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: tc.textMuted }]}>Conta</Text>
                <Text style={[styles.summaryValue, isDark && styles.textLight]} numberOfLines={1}>
                  {accounts.find((a) => a.id === goal.contribution_account_id)?.name ?? '—'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Progress */}
        {!isEditing && (
          <View style={[styles.card, isDark && styles.cardDark, { alignItems: 'center' }]}>
            <Text style={[styles.currentAmount, isDark && styles.textLight]}>
              {formatKz(goal.current_amount)}
            </Text>
            <Text style={[styles.targetAmount, isDark && styles.textMuted]}>
              de {formatKz(goal.target_amount)}
            </Text>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: isComplete ? colors.success : pct >= 75 ? colors.warning : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.pctText, isDark && styles.textMuted]}>{pct}%</Text>

            {progress?.months_remaining != null && (
              <Text style={[styles.monthsText, isDark && styles.textMuted]}>
                ~{progress.months_remaining} meses restantes
              </Text>
            )}
          </View>
        )}

        {/* Contribute */}
        {!isEditing && !isComplete && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>Contribuir</Text>
            <View style={styles.contributeRow}>
              <TextInput
                style={[styles.contributeInput, isDark && styles.editInputDark]}
                value={contributeAmount}
                onChangeText={setContributeAmount}
                placeholder="Valor Kz"
                placeholderTextColor={colors.light.textMuted}
                keyboardType="numeric"
              />
              <Pressable
                style={[styles.contributeBtn, isContributing && { opacity: 0.5 }]}
                onPress={handleContribute}
                disabled={isContributing || !contributeAmount}
              >
                <Text style={styles.contributeBtnText}>
                  {isContributing ? '...' : 'Contribuir'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Contribution history */}
        {!isEditing && progress && progress.contributions.length > 0 && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
              Histórico de contribuicoes
            </Text>
            {progress.contributions.slice(0, 10).map((c, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={[styles.historyDate, isDark && styles.textMuted]}>
                  {new Date(c.contributed_at).toLocaleDateString('pt-AO')}
                </Text>
                <Text style={[styles.historyAmount, isDark && styles.textLight]}>
                  {formatKz(c.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Save button */}
        {isEditing && (
          <Pressable
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{isSaving ? 'A guardar...' : 'Guardar alteracoes'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.bg },
  containerDark: { backgroundColor: colors.dark.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: colors.light.textMuted },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.light.text },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: colors.light.card, borderRadius: 16, padding: 16 },
  cardDark: { backgroundColor: colors.dark.card },
  goalName: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: colors.light.text },
  completedLabel: { fontSize: 13, fontWeight: '600', color: colors.success, marginTop: 4 },
  currentAmount: { fontSize: 32, fontWeight: '700', fontFamily: 'monospace', color: colors.light.text },
  targetAmount: { fontSize: 14, fontFamily: 'monospace', color: colors.light.textMuted, marginTop: 4 },
  progressBar: {
    width: '100%', height: 10, backgroundColor: colors.light.separator, borderRadius: 5,
    marginTop: 16, overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  pctText: { fontSize: 14, fontWeight: '600', color: colors.light.textMuted, marginTop: 4 },
  monthsText: { fontSize: 13, color: colors.light.textMuted, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.light.textMuted, marginBottom: 12 },
  contributeRow: { flexDirection: 'row', gap: 8 },
  contributeInput: {
    flex: 1, fontSize: 16, fontFamily: 'monospace', borderWidth: 1, borderColor: colors.light.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.light.text,
  },
  contributeBtn: {
    backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  contributeBtnText: { color: colors.dark.text, fontSize: 14, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: colors.light.separator,
  },
  historyDate: { fontSize: 13, color: colors.light.textMuted },
  historyAmount: { fontSize: 13, fontFamily: 'monospace', color: colors.light.text },
  editInput: {
    fontSize: 16, borderWidth: 1, borderColor: colors.light.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.light.text, textAlign: 'center',
  },
  editInputDark: { borderColor: colors.dark.border, color: colors.dark.text },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: colors.dark.text, fontSize: 16, fontWeight: '600' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
  autoToggleRow: { flexDirection: 'row', alignItems: 'center' },
  autoTitle: { fontSize: 14, fontWeight: '600' },
  autoDescription: { fontSize: 12, marginTop: 2 },
  autoFields: { marginTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  fieldInput: {
    fontSize: 16, borderWidth: 1, borderColor: colors.light.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.light.text,
  },
  helper: { fontSize: 11, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    borderColor: colors.light.border, backgroundColor: colors.light.card, minWidth: 80,
    alignItems: 'center',
  },
  chipDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.card },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipLabel: { fontSize: 12, color: colors.light.textSecondary },
  chipLabelSelected: { color: colors.primary, fontWeight: '600' },
  chipBalance: { fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.light.text, maxWidth: '60%' },
})
