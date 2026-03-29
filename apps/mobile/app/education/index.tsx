import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Challenge, useEducationStore } from '../../stores/education'

export default function EducationScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { dailyTip, challenges, profile, isLoading, fetchDailyTip, fetchChallenges, fetchProfile } = useEducationStore()

  useEffect(() => {
    fetchDailyTip()
    fetchChallenges()
    fetchProfile()
  }, [])

  const onRefresh = useCallback(() => {
    fetchDailyTip()
    fetchChallenges()
    fetchProfile()
  }, [])

  const renderProfileCard = () => {
    if (!profile) return null

    const xpPct = profile.xp_to_next_level > 0
      ? Math.round((profile.xp / profile.xp_to_next_level) * 100)
      : 0

    return (
      <View style={[styles.profileCard, isDark && styles.cardDark]}>
        <View style={styles.profileHeader}>
          <View style={styles.levelBadge}>
            <Ionicons name="shield-checkmark" size={24} color="#f59e0b" />
            <Text style={styles.levelText}>Nivel {profile.level}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame-outline" size={18} color="#ef4444" />
            <Text style={[styles.streakText, isDark && styles.textLight]}>
              {profile.streak_days} dias
            </Text>
          </View>
        </View>

        <View style={styles.xpRow}>
          <Text style={[styles.xpLabel, isDark && styles.textMuted]}>
            {profile.xp} / {profile.xp_to_next_level} XP
          </Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(xpPct, 100)}%` }]} />
        </View>

        {profile.badges.length > 0 && (
          <View style={styles.badgesRow}>
            {profile.badges.map((badge) => (
              <View key={badge.id} style={[styles.badgeChip, isDark && styles.badgeChipDark]}>
                <Ionicons name="ribbon-outline" size={14} color="#f59e0b" />
                <Text style={[styles.badgeName, isDark && styles.textMuted]}>{badge.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  const renderDailyTip = () => {
    if (!dailyTip) return null

    return (
      <View style={[styles.tipCard, isDark && styles.cardDark]}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
          <Text style={[styles.tipTitle, isDark && styles.textLight]}>Dica do dia</Text>
        </View>
        <Text style={[styles.tipHeadline, isDark && styles.textLight]}>{dailyTip.title}</Text>
        <Text style={[styles.tipContent, isDark && styles.textMuted]}>{dailyTip.content}</Text>
      </View>
    )
  }

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const pct = item.target > 0 ? Math.round((item.progress / item.target) * 100) : 0
    const isCompleted = item.status === 'completed'

    return (
      <View style={[styles.challengeCard, isDark && styles.cardDark]}>
        <View style={styles.challengeHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.challengeName, isDark && styles.textLight]}>{item.title}</Text>
            <Text style={[styles.challengeDesc, isDark && styles.textMuted]}>{item.description}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text style={styles.xpBadgeText}>{item.xp_reward} XP</Text>
          </View>
        </View>

        <View style={styles.progressBg}>
          <View
            style={[styles.progressFill, {
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: isCompleted ? '#22c55e' : '#3b82f6',
            }]}
          />
        </View>
        <View style={styles.challengeFooter}>
          <Text style={[styles.progressText, isDark && styles.textMuted]}>
            {item.progress}/{item.target}
          </Text>
          {isCompleted && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.completedText}>Concluido</Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Educacao financeira</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallenge}
        ListHeaderComponent={
          <>
            {renderProfileCard()}
            {renderDailyTip()}
            {challenges.length > 0 && (
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Desafios</Text>
            )}
          </>
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhum desafio disponivel</Text>
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
  list: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginTop: 4 },

  // Profile card
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardDark: { backgroundColor: '#1a1a1a' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelText: { fontSize: 18, fontWeight: '700', color: '#f59e0b' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 14, fontWeight: '600', color: '#000' },
  xpRow: { marginBottom: 6 },
  xpLabel: { fontSize: 12, color: '#999' },
  progressBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, marginBottom: 4 },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  badgeChipDark: { backgroundColor: '#3b2e0a' },
  badgeName: { fontSize: 11, color: '#92400e', fontWeight: '600' },

  // Daily tip
  tipCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  tipHeadline: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 6 },
  tipContent: { fontSize: 14, color: '#666', lineHeight: 20 },

  // Challenge card
  challengeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  challengeName: { fontSize: 15, fontWeight: '600', color: '#000' },
  challengeDesc: { fontSize: 13, color: '#999', marginTop: 2 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  xpBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  challengeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: 12, color: '#999' },
  completedText: { fontSize: 12, color: '#22c55e', fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
