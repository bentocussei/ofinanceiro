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

export default function DebtSimulatorScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()

  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [payment, setPayment] = useState('')
  const [result, setResult] = useState<{
    months: number
    totalInterest: number
    totalPaid: number
  } | null>(null)

  const bg = isDark ? '#000' : '#f5f5f5'
  const card = isDark ? '#1a1a1a' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#e5e5e5'
  const accent = isDark ? '#fff' : '#000'

  function simulate() {
    const b = parseFloat(balance) * 100
    const r = parseFloat(rate) / 100 / 12 // Monthly rate
    const p = parseFloat(payment) * 100

    if (!b || !p || p <= 0 || b <= 0) return

    let remaining = b
    let months = 0
    let totalInterest = 0
    const maxMonths = 600 // 50 years max

    while (remaining > 0 && months < maxMonths) {
      const interest = r > 0 ? remaining * r : 0
      totalInterest += interest
      remaining = remaining + interest - p

      if (remaining < 0) remaining = 0
      months++
    }

    setResult({
      months,
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(b + totalInterest),
    })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Simulador de amortizacao</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.label, { color: muted }]}>Saldo actual (Kz)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={balance}
            onChangeText={setBalance}
            keyboardType="numeric"
            placeholder="Ex: 500000"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Taxa de juro anual (%)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
            placeholder="Ex: 18"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Pagamento mensal (Kz)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={payment}
            onChangeText={setPayment}
            keyboardType="numeric"
            placeholder="Ex: 25000"
            placeholderTextColor={muted}
          />

          <Pressable
            style={[styles.simBtn, { backgroundColor: accent }]}
            onPress={simulate}
          >
            <Text style={[styles.simBtnText, { color: isDark ? '#000' : '#fff' }]}>
              Simular
            </Text>
          </Pressable>
        </View>

        {result && (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.resultTitle, { color: text }]}>Resultado</Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: muted }]}>Meses para liquidar</Text>
              <Text style={[styles.resultValue, { color: text }]}>
                {result.months >= 600 ? 'Nunca' : `${result.months} meses (${Math.round(result.months / 12)} anos)`}
              </Text>
            </View>

            <View style={[styles.resultRow, { borderTopColor: border }]}>
              <Text style={[styles.resultLabel, { color: muted }]}>Total de juros</Text>
              <Text style={[styles.resultValue, { color: '#ef4444' }]}>
                {formatKz(result.totalInterest)}
              </Text>
            </View>

            <View style={[styles.resultRow, { borderTopColor: border }]}>
              <Text style={[styles.resultLabel, { color: muted }]}>Total pago</Text>
              <Text style={[styles.resultValue, { color: text }]}>
                {formatKz(result.totalPaid)}
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
