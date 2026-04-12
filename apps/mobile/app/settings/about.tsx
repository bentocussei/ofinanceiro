import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import * as WebBrowser from 'expo-web-browser'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AboutScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()

  const bg = isDark ? '#000' : '#f5f5f5'
  const card = isDark ? '#1a1a1a' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#e5e5e5'

  const version = Constants.expoConfig?.version || '1.0.0'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={text} />
          </Pressable>
          <Text style={[styles.title, { color: text }]}>Sobre</Text>
        </View>

        <View style={styles.logoSection}>
          <Text style={[styles.appName, { color: text }]}>O Financeiro</Text>
          <Text style={[styles.version, { color: muted }]}>Versao {version}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.desc, { color: muted }]}>
            A melhor app de gestao financeira pessoal e familiar para Angola e PALOP.
            Controla as tuas financas com ajuda da inteligencia artificial.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: card, borderColor: border, marginTop: 12 }]}>
          <AboutRow
            icon="globe-outline"
            label="Website"
            value="ofinanceiro.app"
            isDark={isDark}
            onPress={() => WebBrowser.openBrowserAsync('https://ofinanceiro.app')}
          />
          <AboutRow
            icon="mail-outline"
            label="Contacto"
            value="suporte@ofinanceiro.app"
            isDark={isDark}
            isLast
          />
        </View>

        <Text style={[styles.copyright, { color: muted }]}>
          2026 Magiflex. Todos os direitos reservados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function AboutRow({
  icon,
  label,
  value,
  isDark,
  onPress,
  isLast,
}: {
  icon: string
  label: string
  value: string
  isDark: boolean
  onPress?: () => void
  isLast?: boolean
}) {
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#f0f0f0'

  return (
    <Pressable
      style={[styles.row, !isLast && { borderBottomWidth: 0.5, borderBottomColor: border }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={18} color={muted} />
      <Text style={[styles.rowLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: text }]}>{value}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  logoSection: { alignItems: 'center', paddingVertical: 24 },
  appName: { fontSize: 24, fontWeight: '800' },
  version: { fontSize: 13, marginTop: 4 },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16 },
  desc: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  rowLabel: { fontSize: 14 },
  rowValue: { flex: 1, fontSize: 14, fontWeight: '500', textAlign: 'right' },
  copyright: { textAlign: 'center', fontSize: 12, marginTop: 32, marginBottom: 24 },
})
