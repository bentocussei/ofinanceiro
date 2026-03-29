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

interface BudgetItemStatus {
  category_id: string
  category_name: string
  category_icon: string | null
  limit_amount: number
  spent: number
  remaining: number
  percentage: number
}

interface BudgetStatus {
  budget_id: string
  name: string | null
  days_remaining: number
  total_limit: number | null
  total_spent: number
  total_remaining: number
  percentage: number
  items: BudgetItemStatus[]
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return '#ef4444'
  if (pct >= 90) return '#f97316'
  if (pct >= 70) return '#f59e0b'
  return '#22c55e'
}

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'

  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (id) {
      apiFetch<BudgetStatus>(`/api/v1/budgets/${id}/status`)
        .then((data) => {
          setStatus(data)
          setEditName(data.name || '')
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
          Alert.alert('Erro', 'Orcamento nao encontrado')
          router.back()
        })
    }
  }, [id])

  const handleSave = async () => {
    if (!id) return
    setIsSaving(true)
    try {
      await apiFetch(`/api/v1/budgets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim() }),
      })
      setIsEditing(false)
      // Refresh
      const data = await apiFetch<BudgetStatus>(`/api/v1/budgets/${id}/status`)
      setStatus(data)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel actualizar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (!id) return
    Alert.alert('Eliminar', 'Tem a certeza que deseja eliminar este orcamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/v1/budgets/${id}`, { method: 'DELETE' })
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

  if (!status) return null

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>Orcamento</Text>
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
        {/* Name */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          {isEditing ? (
            <TextInput
              style={[styles.editInput, isDark && styles.editInputDark]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nome do orcamento"
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={[styles.budgetName, isDark && styles.textLight]}>
              {status.name || 'Orcamento'}
            </Text>
          )}
        </View>

        {/* Summary */}
        <View style={[styles.card, isDark && styles.cardDark, styles.summaryCard]}>
          <Text style={[styles.spentLabel, isDark && styles.textMuted]}>Gasto</Text>
          <Text style={[styles.spentAmount, isDark && styles.textLight]}>
            {formatKz(status.total_spent)}
          </Text>
          <Text style={[styles.limitLabel, isDark && styles.textMuted]}>
            de {formatKz(status.total_limit || 0)}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(status.percentage, 100)}%`,
                  backgroundColor: getProgressColor(status.percentage),
                },
              ]}
            />
          </View>

          <View style={styles.row}>
            <Text style={[styles.pctText, { color: getProgressColor(status.percentage) }]}>
              {status.percentage}% utilizado
            </Text>
            <Text style={[styles.daysText, isDark && styles.textMuted]}>
              {status.days_remaining} dias restantes
            </Text>
          </View>
        </View>

        {/* Category breakdown */}
        {status.items.length > 0 && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>Por categoria</Text>
            {status.items.map((item) => (
              <View key={item.category_id} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <Text style={[styles.categoryName, isDark && styles.textLight]}>
                    {item.category_name}
                  </Text>
                  <Text style={[styles.categoryAmount, isDark && styles.textMuted]}>
                    {formatKz(item.spent)} / {formatKz(item.limit_amount)}
                  </Text>
                </View>
                <View style={styles.categoryProgress}>
                  <View
                    style={[
                      styles.categoryProgressFill,
                      {
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: getProgressColor(item.percentage),
                      },
                    ]}
                  />
                </View>
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
  budgetName: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: '#000' },
  summaryCard: { alignItems: 'center' },
  spentLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  spentAmount: { fontSize: 32, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  limitLabel: { fontSize: 14, color: '#999', marginTop: 4, fontFamily: 'monospace' },
  progressBar: {
    width: '100%', height: 10, backgroundColor: '#f0f0f0', borderRadius: 5,
    marginTop: 16, overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  pctText: { fontSize: 13, fontWeight: '600' },
  daysText: { fontSize: 13, color: '#999' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 12 },
  categoryRow: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  categoryName: { fontSize: 14, color: '#000' },
  categoryAmount: { fontSize: 12, fontFamily: 'monospace', color: '#999' },
  categoryProgress: {
    height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden',
  },
  categoryProgressFill: { height: 6, borderRadius: 3 },
  editInput: {
    fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8,
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
