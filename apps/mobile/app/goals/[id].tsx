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
import { formatKz } from '../../lib/format'

interface GoalDetail {
  id: string
  name: string
  type: string
  target_amount: number
  current_amount: number
  monthly_contribution: number | null
  status: string
}

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

  const [goal, setGoal] = useState<GoalDetail | null>(null)
  const [progress, setProgress] = useState<GoalProgress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [contributeAmount, setContributeAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isContributing, setIsContributing] = useState(false)

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
      setIsLoading(false)
    } catch {
      setIsLoading(false)
      Alert.alert('Erro', 'Meta nao encontrada')
      router.back()
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

      if (Object.keys(updates).length > 0) {
        await apiFetch(`/api/v1/goals/${goal.id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      }
      setIsEditing(false)
      await fetchData()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel actualizar')
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
      Alert.alert('Erro', error.message || 'Nao foi possivel contribuir')
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
            Alert.alert('Erro', error.message || 'Nao foi possivel eliminar')
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
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>Meta</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setIsEditing(!isEditing)} style={styles.actionBtn}>
            <Ionicons name={isEditing ? 'close' : 'pencil'} size={20} color={isDark ? '#fff' : '#000'} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
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
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.editInput, isDark && styles.editInputDark]}
                value={editTarget}
                onChangeText={setEditTarget}
                placeholder="Valor alvo (Kz)"
                placeholderTextColor="#999"
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
                    backgroundColor: isComplete ? '#22c55e' : pct >= 75 ? '#f59e0b' : '#3b82f6',
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
                placeholderTextColor="#999"
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
              Historico de contribuicoes
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#999' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardDark: { backgroundColor: '#1a1a1a' },
  goalName: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: '#000' },
  completedLabel: { fontSize: 13, fontWeight: '600', color: '#22c55e', marginTop: 4 },
  currentAmount: { fontSize: 32, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  targetAmount: { fontSize: 14, fontFamily: 'monospace', color: '#999', marginTop: 4 },
  progressBar: {
    width: '100%', height: 10, backgroundColor: '#f0f0f0', borderRadius: 5,
    marginTop: 16, overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  pctText: { fontSize: 14, fontWeight: '600', color: '#999', marginTop: 4 },
  monthsText: { fontSize: 13, color: '#999', marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 12 },
  contributeRow: { flexDirection: 'row', gap: 8 },
  contributeInput: {
    flex: 1, fontSize: 16, fontFamily: 'monospace', borderWidth: 1, borderColor: '#e5e5e5',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#000',
  },
  contributeBtn: {
    backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  contributeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  historyDate: { fontSize: 13, color: '#999' },
  historyAmount: { fontSize: 13, fontFamily: 'monospace', color: '#000' },
  editInput: {
    fontSize: 16, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: '#000', textAlign: 'center',
  },
  editInputDark: { borderColor: '#333', color: '#fff' },
  saveBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
