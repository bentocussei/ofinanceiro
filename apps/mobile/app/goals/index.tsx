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

import IconDisplay from '../../components/common/IconDisplay'
import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { Goal, useGoalsStore } from '../../stores/goals'

export default function GoalsScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
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
    const isComplete = item.status === 'completed'

    return (
      <Pressable
        style={[styles.goalCard, isDark && styles.cardDark]}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalIcon}><IconDisplay name={item.type} size={24} color={tc.text} /></View>
          <View style={styles.goalInfo}>
            <Text style={[styles.goalName, isDark && styles.textLight]}>{item.name}</Text>
            {isComplete && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.completeBadge}>Concluída</Text>
              </View>
            )}
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
              backgroundColor: isComplete ? colors.success : pct >= 75 ? colors.warning : colors.primary,
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
                placeholderTextColor={colors.light.textMuted}
                keyboardType="numeric"
                value={contributeAmount}
                onChangeText={setContributeAmount}
                autoFocus
              />
              <Pressable style={styles.contributeBtn} onPress={handleContribute}>
                <Text style={styles.contributeBtnText}>Contribuir</Text>
              </Pressable>
              <Pressable onPress={() => setContributeGoalId(null)}>
                <Ionicons name="close" size={20} color={colors.light.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addContributeBtn}
              onPress={() => { setContributeGoalId(item.id); setContributeAmount('') }}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
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
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Metas</Text>
        <Pressable
          style={[styles.addBtn, isDark && styles.addBtnDark]}
          onPress={() => router.push('/goals/create')}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
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
            <IconDisplay name="custom" size={48} color={tc.handle} />
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
  container: { flex: 1, backgroundColor: colors.light.bg },
  containerDark: { backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.light.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  addBtnDark: { backgroundColor: colors.brand },
  list: { padding: 16, gap: 12 },
  goalCard: { backgroundColor: colors.light.card, borderRadius: 16, padding: 16 },
  cardDark: { backgroundColor: colors.dark.card },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  goalIcon: { width: 24, height: 24 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: '600', color: colors.light.text },
  completeBadge: { fontSize: 12, color: colors.success, marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  currentAmount: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', color: colors.light.text },
  targetAmount: { fontSize: 13, fontFamily: 'monospace', color: colors.light.textMuted, marginLeft: 4 },
  progressBg: { height: 8, backgroundColor: colors.light.separator, borderRadius: 4, marginBottom: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  pctText: { fontSize: 12, color: colors.light.textMuted, marginBottom: 8 },
  addContributeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addContributeText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  contributeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  contributeInput: {
    flex: 1, borderWidth: 1, borderColor: colors.light.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: 'monospace', color: colors.light.text,
  },
  inputDark: { borderColor: colors.dark.border, color: colors.dark.text, backgroundColor: colors.dark.input },
  contributeBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  contributeBtnText: { color: colors.dark.text, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: colors.light.textMuted },
  emptySubtext: { fontSize: 13, color: colors.light.handle, textAlign: 'center' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.dark.textMuted },
})
