import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { themeColors } from '../../lib/tokens'
import ReferralCard from '../../components/referral/ReferralCard'

export default function ReferralScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()

  const tc = themeColors(isDark)
  const bg = tc.bg
  const text = tc.text
  const muted = tc.textSecondary

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={text} onPress={() => router.back()} />
        <Text style={[styles.title, { color: text }]}>Convidar amigos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ReferralCard />

        <View style={styles.info}>
          <Text style={[styles.infoTitle, { color: text }]}>Como funciona</Text>
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: muted }]}>1</Text>
            <Text style={[styles.stepText, { color: muted }]}>Partilha o teu codigo com amigos</Text>
          </View>
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: muted }]}>2</Text>
            <Text style={[styles.stepText, { color: muted }]}>O amigo regista-se com o teu codigo</Text>
          </View>
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: muted }]}>3</Text>
            <Text style={[styles.stepText, { color: muted }]}>Ambos ganham 30 dias gratis</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  content: { paddingHorizontal: 16, gap: 20, paddingBottom: 40 },
  info: { gap: 12 },
  infoTitle: { fontSize: 16, fontWeight: '600' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: { fontSize: 20, fontWeight: '700', width: 28 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
})
