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
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { colors, themeColors } from '../../lib/tokens'

interface Member {
  id: string
  user_id: string
  display_name: string
  role: 'admin' | 'adult' | 'dependent'
  is_active: boolean
}

interface Family {
  id: string
  name: string
  invite_code: string
  members: Member[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  adult: 'Adulto',
  dependent: 'Dependente',
}

const ROLE_ICONS: Record<string, string> = {
  admin: 'shield',
  adult: 'people',
  dependent: 'person',
}

const ROLE_COLORS: Record<string, string> = {
  admin: colors.warning,
  adult: colors.primary,
  dependent: '#888',
}

export default function FamilyMembersScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border

  const fetchFamily = useCallback(async () => {
    try {
      const data = await apiFetch<Family>('/api/v1/families/me')
      setFamily(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a família')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFamily() }, [])

  async function handleChangeRole(member: Member) {
    const roles = ['admin', 'adult', 'dependent'].filter((r) => r !== member.role)
    Alert.alert(
      `Alterar papel de ${member.display_name}`,
      'Escolha o novo papel:',
      [
        ...roles.map((role) => ({
          text: ROLE_LABELS[role],
          onPress: async () => {
            try {
              await apiFetch(`/api/v1/families/members/${member.id}`, {
                method: 'PUT',
                body: JSON.stringify({ role }),
              })
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              fetchFamily()
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao alterar papel')
            }
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    )
  }

  async function handleRemove(member: Member) {
    Alert.alert('Remover membro', `Remover ${member.display_name} da família?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/v1/families/members/${member.id}`, { method: 'DELETE' })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            fetchFamily()
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao remover')
          }
        },
      },
    ])
  }

  const activeMembers = family?.members.filter((m) => m.is_active) || []

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Membros</Text>
      </View>

      {/* Invite code */}
      {family?.invite_code && (
        <View style={[styles.inviteCard, { backgroundColor: card, borderColor: border }]}>
          <Ionicons name="link-outline" size={18} color={muted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.inviteLabel, { color: muted }]}>Código de convite</Text>
            <Text style={[styles.inviteCode, { color: text }]}>{family.invite_code}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={activeMembers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchFamily} />}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.memberCard, { backgroundColor: card, borderColor: border }]}
            onPress={() => handleChangeRole(item)}
            onLongPress={() => handleRemove(item)}
          >
            <Ionicons
              name={ROLE_ICONS[item.role] as any || 'person'}
              size={24}
              color={ROLE_COLORS[item.role] || muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: text }]}>{item.display_name}</Text>
              <Text style={[styles.memberRole, { color: ROLE_COLORS[item.role] || muted }]}>
                {ROLE_LABELS[item.role] || item.role}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={muted} />
          </Pressable>
        )}
        ListFooterComponent={
          <Text style={[styles.hint, { color: muted }]}>
            Toque para alterar papel. Pressione longo para remover.
          </Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  inviteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  inviteLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  inviteCode: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 40 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 12, borderWidth: 1,
  },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberRole: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16 },
})
