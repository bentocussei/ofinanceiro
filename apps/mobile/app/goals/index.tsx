import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { Goal, useGoalsStore } from '../../stores/goals'

const GOAL_ICONS: Record<string, string> = {
  savings: '💰', emergency_fund: '🛡️', purchase: '🛒', travel: '✈️',
  event: '🎉', education: '📚', retirement: '🏖️', custom: '🎯',
}

export default function GoalsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { goals, isLoading, fetchGoals, contribute, deleteGoal } = useGoalsStore()
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')

  useEffect(() => { fetchGoals() }, [])
  const onRefresh = useCallback(() => fetchGoals(), [])

  const handleContribute = async () => {
    if (!contributeGoalId || !contributeAmount) return
    const amount = Math.round(parseFloat(contributeAmount) * 100)
    if (amount <= 0) return

    try {
      await contribute(contributeGoalId, amount)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setContributeGoalId(null)
      setContributeAmount('')
    } catch (error: any) {
      Alert.alert('Erro', error.message)
    }
  }

  const handleDelete = (goal: Goal) => {
    Alert.alert('Eliminar', `Eliminar meta "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteGoal(goal.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const renderGoal = ({ item }: { item: Goal }) => {
    const pct = item.target_amount > 0 ? Math.round(item.current_amount / item.target_amount * 100) : 0
    const icon = GOAL_ICONS[item.type] || '🎯'
    const isComplete = item.status === 'completed'

    return (
      <Pressable
        style={[styles.goalCard, isDark && styles.cardDark]}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.goalHeader}>
          <Text style={styles.goalIcon}>{icon}</Text>
          <View style={styles.goalInfo}>
            <Text style={[styles.goalName, isDark && styles.textLight]}>{item.name}</Text>
            {isComplete && <Text style={styles.completeBadge}>✅ Concluída</Text>}
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, isDark && styles.textLight]}>
            {formatKz(item.current_amount)}
          </Text>
          <Text style={[styles.targetAmount, isDark && styles.textMuted]}>
            / {formatKz(item.target_amount)}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View
            style={[styles.progressFill, {
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: isComplete ? '#22c55e' : pct >= 75 ? '#f59e0b' : '#3b82f6',
            }]}
          />
        </View>
        <Text style={[styles.pctText, isDark && styles.textMuted]}>{pct}%</Text>

        {/* Contribute button */}
        {!isComplete && (
          contributeGoalId === item.id ? (
            <View style={styles.contributeRow}>
              <TextInput
                style={[styles.contributeInput, isDark && styles.inputDark]}
                placeholder="Valor Kz"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={contributeAmount}
                onChangeText={setContributeAmount}
                autoFocus
              />
              <Pressable style={styles.contributeBtn} onPress={handleContribute}>
                <Text style={styles.contributeBtnText}>Contribuir</Text>
              </Pressable>
              <Pressable onPress={() => setContributeGoalId(null)}>
                <Ionicons name="close" size={20} color="#999" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addContributeBtn}
              onPress={() => { setContributeGoalId(item.id); setContributeAmount('') }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#3b82f6" />
              <Text style={styles.addContributeText}>Contribuir</Text>
            </Pressable>
          )
        )}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Metas</Text>
        <Pressable
          style={[styles.addBtn, isDark && styles.addBtnDark]}
          onPress={() => router.push('/goals/create')}
        >
          <Ionicons name="add" size={20} color="#3b82f6" />
        </Pressable>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoal}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma meta criada</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Defina metas para poupar e alcançar os seus objectivos
            </Text>
          </View>
        }
      />
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  addBtnDark: { backgroundColor: '#1e3a5f' },
  list: { padding: 16, gap: 12 },
  goalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardDark: { backgroundColor: '#1a1a1a' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  goalIcon: { fontSize: 24 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: '600', color: '#000' },
  completeBadge: { fontSize: 12, color: '#22c55e', marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  currentAmount: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  targetAmount: { fontSize: 13, fontFamily: 'monospace', color: '#999', marginLeft: 4 },
  progressBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, marginBottom: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  pctText: { fontSize: 12, color: '#999', marginBottom: 8 },
  addContributeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addContributeText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  contributeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  contributeInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: 'monospace', color: '#000',
  },
  inputDark: { borderColor: '#333', color: '#fff', backgroundColor: '#111' },
  contributeBtn: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  contributeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#999' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
