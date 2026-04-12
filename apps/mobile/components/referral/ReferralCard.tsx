import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'

import { apiFetch } from '../../lib/api'

interface ReferralStats {
  referral_code: string
  total_referrals: number
  bonus_days_earned: number
  max_referrals: number
  share_message: string
}

export default function ReferralCard() {
  const isDark = useColorScheme() === 'dark'
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)

  const card = isDark ? '#1a1a1a' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#e5e5e5'
  const accent = isDark ? '#fff' : '#000'

  useEffect(() => {
    apiFetch<ReferralStats>('/api/v1/referrals/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCopy() {
    if (!stats) return
    await Clipboard.setStringAsync(stats.referral_code)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Alert.alert('Copiado', 'Codigo copiado para a area de transferencia')
  }

  async function handleShare() {
    if (!stats) return
    try {
      await Share.share({
        message: stats.share_message || `Usa o meu codigo ${stats.referral_code} no O Financeiro! https://ofinanceiro.app/register?ref=${stats.referral_code}`,
      })
    } catch {
      // User cancelled
    }
  }

  if (loading) return null

  const total = stats?.total_referrals ?? 0
  const max = stats?.max_referrals ?? 12
  const pct = max > 0 ? Math.min((total / max) * 100, 100) : 0

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.headerRow}>
        <Ionicons name="gift" size={20} color="#f59e0b" />
        <Text style={[styles.title, { color: text }]}>Convidar amigos</Text>
      </View>

      <Text style={[styles.subtitle, { color: muted }]}>
        Ganha dias gratis por cada convite
      </Text>

      {/* Code */}
      <View style={[styles.codeRow, { borderColor: border }]}>
        <View>
          <Text style={[styles.codeLabel, { color: muted }]}>O seu codigo</Text>
          <Text style={[styles.codeValue, { color: text }]}>
            {stats?.referral_code || '—'}
          </Text>
        </View>
        <View style={styles.codeActions}>
          <Pressable style={[styles.actionBtn, { borderColor: border }]} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={18} color={muted} />
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: accent }]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color={isDark ? '#000' : '#fff'} />
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Ionicons name="people-outline" size={16} color={muted} />
        <Text style={[styles.statsText, { color: muted }]}>
          Convidaste {total} amigo{total !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <Text style={[styles.progressLabel, { color: muted }]}>
          {total} de {max} referencias usadas
        </Text>
        <View style={[styles.progressBg, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#22c55e' }]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  codeLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeValue: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  codeActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  statsText: { fontSize: 13 },
  progressSection: { marginTop: 12 },
  progressLabel: { fontSize: 12, marginBottom: 6 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
})
