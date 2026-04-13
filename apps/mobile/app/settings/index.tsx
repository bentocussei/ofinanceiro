import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuthStore } from '../../stores/auth'

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const bg = isDark ? '#000' : '#f5f5f5'
  const card = isDark ? '#1a1a1a' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#f0f0f0'

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={text} />
          </Pressable>
          <Text style={[styles.title, { color: text }]}>Definicoes</Text>
        </View>

        {/* Profile Card */}
        <Pressable
          style={[styles.profileCard, { backgroundColor: card, borderColor: border }]}
          onPress={() => router.push('/settings/profile')}
        >
          <View style={[styles.avatar, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]}>
            <Text style={[styles.avatarText, { color: text }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: text }]}>
              {user?.name || 'Utilizador'}
            </Text>
            <Text style={[styles.profilePhone, { color: muted }]}>
              {user?.phone || ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={muted} />
        </Pressable>

        {/* Sections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: muted }]}>Conta</Text>
          <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
            <SettingsRow
              icon="person-outline"
              label="Perfil"
              isDark={isDark}
              onPress={() => router.push('/settings/profile')}
            />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Seguranca"
              isDark={isDark}
              onPress={() => router.push('/settings/security')}
            />
            <SettingsRow
              icon="diamond-outline"
              label="Subscricao"
              isDark={isDark}
              onPress={() => router.push('/settings/subscription')}
            />
            <SettingsRow
              icon="gift-outline"
              label="Convidar amigos"
              isDark={isDark}
              onPress={() => router.push('/settings/referral')}
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: muted }]}>Preferencias</Text>
          <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
            <SettingsRow
              icon="pricetags-outline"
              label="Tags"
              isDark={isDark}
              onPress={() => router.push('/settings/tags')}
            />
            <SettingsRow
              icon="notifications-outline"
              label="Notificacoes"
              isDark={isDark}
              onPress={() => router.push('/notifications')}
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: muted }]}>Informacao</Text>
          <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
            <SettingsRow
              icon="information-circle-outline"
              label="Sobre"
              isDark={isDark}
              onPress={() => router.push('/settings/about')}
              isLast
            />
          </View>
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Terminar sessao</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingsRow({
  icon,
  label,
  isDark,
  onPress,
  isLast,
}: {
  icon: string
  label: string
  isDark: boolean
  onPress?: () => void
  isLast?: boolean
}) {
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#666' : '#ccc'
  const border = isDark ? '#333' : '#f0f0f0'

  return (
    <Pressable
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 0.5, borderBottomColor: border },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color={isDark ? '#aaa' : '#555'} />
      <Text style={[styles.rowLabel, { color: text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: '600' },
  profilePhone: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLabel: { flex: 1, fontSize: 15, marginLeft: 12 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: '500' },
})
