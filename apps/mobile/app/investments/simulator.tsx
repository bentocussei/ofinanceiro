import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'

export default function InvestmentSimulatorScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()

  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [years, setYears] = useState('')
  const [monthly, setMonthly] = useState('')
  const [result, setResult] = useState<{
    finalValue: number
    totalInvested: number
    totalInterest: number
  } | null>(null)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

  function simulate() {
    const p = (parseFloat(principal) || 0) * 100
    const r = (parseFloat(rate) || 0) / 100 / 12
    const n = (parseInt(years) || 1) * 12
    const m = (parseFloat(monthly) || 0) * 100

    // Compound interest with monthly contributions
    // FV = P(1+r)^n + M * ((1+r)^n - 1) / r
    let fv: number
    if (r > 0) {
      const compound = Math.pow(1 + r, n)
      fv = p * compound + m * (compound - 1) / r
    } else {
      fv = p + m * n
    }

    const totalInvested = p + m * n

    setResult({
      finalValue: Math.round(fv),
      totalInvested: Math.round(totalInvested),
      totalInterest: Math.round(fv - totalInvested),
    })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Simulador de juros compostos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.label, { color: muted }]}>Capital inicial (Kz)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={principal}
            onChangeText={setPrincipal}
            keyboardType="numeric"
            placeholder="Ex: 100000"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Taxa anual (%)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
            placeholder="Ex: 12"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Periodo (anos)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={years}
            onChangeText={setYears}
            keyboardType="numeric"
            placeholder="Ex: 5"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Contribuicao mensal (Kz, opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={monthly}
            onChangeText={setMonthly}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={muted}
          />

          <Pressable
            style={[styles.simBtn, { backgroundColor: accent }]}
            onPress={simulate}
          >
            <Text style={[styles.simBtnText, { color: isDark ? colors.dark.bg : colors.light.bg }]}>
              Simular
            </Text>
          </Pressable>
        </View>

        {result && (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.resultTitle, { color: text }]}>Resultado</Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: muted }]}>Valor final</Text>
              <Text style={[styles.resultValue, { color: colors.success }]}>
                {formatKz(result.finalValue)}
              </Text>
            </View>

            <View style={[styles.resultRow, { borderTopColor: border }]}>
              <Text style={[styles.resultLabel, { color: muted }]}>Total investido</Text>
              <Text style={[styles.resultValue, { color: text }]}>
                {formatKz(result.totalInvested)}
              </Text>
            </View>

            <View style={[styles.resultRow, { borderTopColor: border }]}>
              <Text style={[styles.resultLabel, { color: muted }]}>Juros ganhos</Text>
              <Text style={[styles.resultValue, { color: colors.success }]}>
                {formatKz(result.totalInterest)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, fontSize: 16, fontFamily: 'monospace' },
  simBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  simBtnText: { fontSize: 16, fontWeight: '600' },
  resultTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 0.5 },
  resultLabel: { fontSize: 14 },
  resultValue: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
})
