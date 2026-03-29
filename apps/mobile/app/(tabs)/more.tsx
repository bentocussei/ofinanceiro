import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, View, Pressable, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuthStore } from '../../stores/auth'

export default function MoreScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.textLight]}>Mais</Text>
      </View>

      <View style={styles.menu}>
        <MenuItem icon="pie-chart-outline" label="Orçamentos" isDark={isDark} onPress={() => router.push('/budget')} />
        <MenuItem icon="bar-chart-outline" label="Relatórios" isDark={isDark} onPress={() => router.push('/(tabs)/reports')} />
        <MenuItem icon="flag-outline" label="Metas" isDark={isDark} onPress={() => router.push('/goals')} />
        <MenuItem icon="card-outline" label="Dívidas" isDark={isDark} onPress={() => router.push('/debts')} />
        <MenuItem icon="trending-up-outline" label="Investimentos" isDark={isDark} onPress={() => router.push('/investments')} />
        <MenuItem icon="people-outline" label="Família" isDark={isDark} onPress={() => router.push('/family')} />
        <MenuItem icon="newspaper-outline" label="Notícias" isDark={isDark} onPress={() => router.push('/news')} />
        <MenuItem icon="school-outline" label="Educação" isDark={isDark} onPress={() => router.push('/education')} />
        <MenuItem icon="notifications-outline" label="Notificações" isDark={isDark} onPress={() => router.push('/notifications')} />
        <MenuItem icon="settings-outline" label="Configurações" isDark={isDark} />

        <Pressable style={styles.logoutRow} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function MenuItem({ icon, label, isDark, onPress }: { icon: string; label: string; isDark: boolean; onPress?: () => void }) {
  return (
    <Pressable style={[styles.menuRow, isDark && styles.menuRowDark]} onPress={onPress}>
      <Ionicons name={icon as any} size={22} color={isDark ? '#ccc' : '#333'} />
      <Text style={[styles.menuLabel, isDark && styles.textLight]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={isDark ? '#666' : '#ccc'} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  menu: { paddingHorizontal: 16 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  menuRowDark: { backgroundColor: '#1a1a1a', borderBottomColor: '#333' },
  menuLabel: { flex: 1, fontSize: 16, color: '#000', marginLeft: 12 },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16,
    marginTop: 24,
  },
  logoutText: { fontSize: 16, color: '#ef4444', marginLeft: 12 },
  textLight: { color: '#fff' },
})
