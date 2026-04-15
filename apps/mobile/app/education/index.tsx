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

import { colors, themeColors } from '../../lib/tokens'
import { Challenge, useEducationStore } from '../../stores/education'

export default function EducationScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { tip: dailyTip, challenges, profile, isLoading, fetchAll } = useEducationStore()

  useEffect(() => {
    fetchAll()
  }, [])

  const onRefresh = useCallback(() => {
    fetchAll()
  }, [])

  const renderProfileCard = () => {
    if (!profile) return null

    const xpPct = profile.xp_to_next_level > 0
      ? Math.round((profile.xp / profile.xp_to_next_level) * 100)
      : 0

    return (
      <View style={[styles.profileCard, { backgroundColor: tc.card }]}>
        <View style={styles.profileHeader}>
          <View style={styles.levelBadge}>
            <Ionicons name="shield-checkmark" size={24} color={colors.warning} />
            <Text style={styles.levelText}>Nível {profile.level}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame-outline" size={18} color={colors.error} />
            <Text style={[styles.streakText, { color: tc.text }]}>
              {profile.streak_days} dias
            </Text>
          </View>
        </View>

        <View style={styles.xpRow}>
          <Text style={[styles.xpLabel, { color: tc.textMuted }]}>
            {profile.xp} / {profile.xp_to_next_level} XP
          </Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: tc.separator }]}>
          <View style={[styles.progressFill, { width: `${Math.min(xpPct, 100)}%` }]} />
        </View>

        {profile.badges.length > 0 && (
          <View style={styles.badgesRow}>
            {profile.badges.map((badge) => (
              <View key={badge.id} style={[styles.badgeChip, isDark && styles.badgeChipDark]}>
                <Ionicons name="ribbon-outline" size={14} color={colors.warning} />
                <Text style={[styles.badgeName, isDark && { color: tc.textMuted }]}>{badge.name}</Text>
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
      <View style={[styles.tipCard, { backgroundColor: tc.card }]}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={20} color={colors.warning} />
          <Text style={[styles.tipTitle, { color: tc.text }]}>Dica do dia</Text>
        </View>
        <Text style={[styles.tipHeadline, { color: tc.text }]}>{dailyTip.title}</Text>
        <Text style={[styles.tipContent, { color: tc.textSecondary }]}>{dailyTip.content}</Text>
      </View>
    )
  }

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const pct = item.target > 0 ? Math.round((item.progress / item.target) * 100) : 0
    const isCompleted = item.status === 'completed'

    return (
      <View style={[styles.challengeCard, { backgroundColor: tc.card }]}>
        <View style={styles.challengeHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.challengeName, { color: tc.text }]}>{item.title}</Text>
            <Text style={[styles.challengeDesc, { color: tc.textMuted }]}>{item.description}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.xpBadgeText}>{item.xp_reward} XP</Text>
          </View>
        </View>

        <View style={[styles.progressBg, { backgroundColor: tc.separator }]}>
          <View
            style={[styles.progressFill, {
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: isCompleted ? colors.success : colors.primary,
            }]}
          />
        </View>
        <View style={styles.challengeFooter}>
          <Text style={[styles.progressText, { color: tc.textMuted }]}>
            {item.progress}/{item.target}
          </Text>
          {isCompleted && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.completedText}>Concluido</Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, { color: tc.text }]}>Educação financeira</Text>
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
              <Text style={[styles.sectionTitle, { color: tc.text }]}>Desafios</Text>
            )}
          </>
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={48} color={tc.handle} />
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>Nenhum desafio disponível</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },

  // Profile card
  profileCard: { borderRadius: 16, padding: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelText: { fontSize: 18, fontWeight: '700', color: colors.warning },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 14, fontWeight: '600' },
  xpRow: { marginBottom: 6 },
  xpLabel: { fontSize: 12 },
  progressBg: { height: 8, borderRadius: 4, marginBottom: 4 },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.warningLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  badgeChipDark: { backgroundColor: '#3b2e0a' },
  badgeName: { fontSize: 11, color: '#92400e', fontWeight: '600' },

  // Daily tip
  tipCard: { borderRadius: 16, padding: 16 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { fontSize: 14, fontWeight: '600' },
  tipHeadline: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  tipContent: { fontSize: 14, lineHeight: 20 },

  // Challenge card
  challengeCard: { borderRadius: 16, padding: 16 },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  challengeName: { fontSize: 15, fontWeight: '600' },
  challengeDesc: { fontSize: 13, marginTop: 2 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warningLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  xpBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  challengeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: 12 },
  completedText: { fontSize: 12, color: colors.success, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16 },
})
