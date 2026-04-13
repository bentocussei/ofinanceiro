import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
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

type ScheduleRow = {
  month: number
  payment: number
  interest: number
  principal: number
  balance: number
}

type SimulationResult = {
  months: number
  totalInterest: number
  totalPaid: number
  schedule: ScheduleRow[]
  reachedMaxMonths: boolean
}

const MAX_MONTHS = 600 // 50 years cap
const MAX_ROWS = 24

export default function DebtSimulatorScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()

  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [payment, setPayment] = useState('')
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tc = themeColors(isDark)

  const styles = useMemo(() => createStyles(tc, isDark), [tc, isDark])

  function simulate() {
    setError(null)
    setResult(null)

    // parse as centavos to avoid float drift
    const b = Math.round(parseFloat(balance) * 100)
    const annualRate = parseFloat(rate)
    const p = Math.round(parseFloat(payment) * 100)

    if (!Number.isFinite(b) || b <= 0) {
      setError('Saldo actual deve ser maior que zero.')
      return
    }
    if (!Number.isFinite(annualRate) || annualRate < 0) {
      setError('Taxa de juro invalida.')
      return
    }
    if (!Number.isFinite(p) || p <= 0) {
      setError('Pagamento mensal deve ser maior que zero.')
      return
    }

    const monthlyRate = annualRate / 100 / 12

    // If rate > 0 and payment doesn't cover first-month interest, debt never amortizes.
    if (monthlyRate > 0 && p <= b * monthlyRate) {
      setError(
        'Pagamento mensal insuficiente para cobrir juros. Aumente o valor do pagamento.',
      )
      return
    }

    let currentBalance = b
    let totalInterest = 0
    const schedule: ScheduleRow[] = []
    let months = 0
    let reachedMaxMonths = false

    for (let m = 1; m <= MAX_MONTHS; m++) {
      const interest = monthlyRate > 0 ? currentBalance * monthlyRate : 0
      const thisPayment = Math.min(p, currentBalance + interest)
      const principal = thisPayment - interest
      const newBalance = Math.max(0, currentBalance - principal)

      totalInterest += interest

      if (schedule.length < MAX_ROWS) {
        schedule.push({
          month: m,
          payment: Math.round(thisPayment),
          interest: Math.round(interest),
          principal: Math.round(principal),
          balance: Math.round(newBalance),
        })
      }

      currentBalance = newBalance
      months = m

      if (currentBalance <= 0) break
      if (m === MAX_MONTHS) reachedMaxMonths = true
    }

    setResult({
      months,
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(b + totalInterest),
      schedule,
      reachedMaxMonths,
    })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, { color: tc.text }]}>Simulador de amortizacao</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Inputs */}
        <View style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <Text style={[styles.label, { color: tc.textSecondary }]}>Saldo actual (Kz)</Text>
          <TextInput
            style={[styles.input, { borderColor: tc.border, color: tc.text }]}
            value={balance}
            onChangeText={setBalance}
            keyboardType="numeric"
            placeholder="Ex: 500000"
            placeholderTextColor={tc.textSecondary}
          />

          <Text style={[styles.label, { color: tc.textSecondary, marginTop: 12 }]}>
            Taxa de juro anual (%)
          </Text>
          <TextInput
            style={[styles.input, { borderColor: tc.border, color: tc.text }]}
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
            placeholder="Ex: 18"
            placeholderTextColor={tc.textSecondary}
          />

          <Text style={[styles.label, { color: tc.textSecondary, marginTop: 12 }]}>
            Pagamento mensal (Kz)
          </Text>
          <TextInput
            style={[styles.input, { borderColor: tc.border, color: tc.text }]}
            value={payment}
            onChangeText={setPayment}
            keyboardType="numeric"
            placeholder="Ex: 25000"
            placeholderTextColor={tc.textSecondary}
          />

          <Pressable style={[styles.simBtn, { backgroundColor: tc.text }]} onPress={simulate}>
            <Text
              style={[
                styles.simBtnText,
                { color: isDark ? colors.dark.bg : colors.light.bg },
              ]}
            >
              Simular
            </Text>
          </Pressable>
        </View>

        {error && (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: tc.card, borderColor: colors.error },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {result && (
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: tc.card }]}>
                <Text style={[styles.summaryLabel, { color: tc.textSecondary }]}>
                  Meses ate pagar
                </Text>
                <Text style={[styles.summaryValue, { color: tc.text }]}>
                  {result.reachedMaxMonths ? '> 600' : result.months}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: tc.card }]}>
                <Text style={[styles.summaryLabel, { color: tc.textSecondary }]}>
                  Juros totais
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.error }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatKz(result.totalInterest)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: tc.card }]}>
                <Text style={[styles.summaryLabel, { color: tc.textSecondary }]}>
                  Total pago
                </Text>
                <Text
                  style={[styles.summaryValue, { color: tc.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatKz(result.totalPaid)}
                </Text>
              </View>
            </View>

            {/* Amortization table */}
            <View
              style={[
                styles.tableCard,
                { backgroundColor: tc.card, borderColor: tc.border },
              ]}
            >
              <Text style={[styles.tableTitle, { color: tc.text }]}>
                Plano de Amortizacao
              </Text>
              <Text style={[styles.tableSubtitle, { color: tc.textMuted }]}>
                Primeiros {Math.min(result.schedule.length, MAX_ROWS)} meses
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableWrap}>
                  <View style={[styles.tableHeader, { backgroundColor: tc.cardAlt }]}>
                    <Text
                      style={[
                        styles.th,
                        styles.colMonth,
                        { color: tc.textSecondary },
                      ]}
                    >
                      Mes
                    </Text>
                    <Text
                      style={[
                        styles.th,
                        styles.colAmount,
                        styles.alignRight,
                        { color: tc.textSecondary },
                      ]}
                    >
                      Pagamento
                    </Text>
                    <Text
                      style={[
                        styles.th,
                        styles.colAmount,
                        styles.alignRight,
                        { color: tc.textSecondary },
                      ]}
                    >
                      Juros
                    </Text>
                    <Text
                      style={[
                        styles.th,
                        styles.colAmount,
                        styles.alignRight,
                        { color: tc.textSecondary },
                      ]}
                    >
                      Capital
                    </Text>
                    <Text
                      style={[
                        styles.th,
                        styles.colAmount,
                        styles.alignRight,
                        { color: tc.textSecondary },
                      ]}
                    >
                      Saldo
                    </Text>
                  </View>

                  {result.schedule.map((row) => (
                    <View
                      key={row.month}
                      style={[styles.tableRow, { borderBottomColor: tc.borderLight }]}
                    >
                      <Text style={[styles.td, styles.colMonth, { color: tc.text }]}>
                        {row.month}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.colAmount,
                          styles.alignRight,
                          { color: tc.text },
                        ]}
                      >
                        {formatKz(row.payment)}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.colAmount,
                          styles.alignRight,
                          { color: colors.error },
                        ]}
                      >
                        {formatKz(row.interest)}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.colAmount,
                          styles.alignRight,
                          { color: tc.text },
                        ]}
                      >
                        {formatKz(row.principal)}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.colAmount,
                          styles.alignRight,
                          { color: tc.text },
                        ]}
                      >
                        {formatKz(row.balance)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(tc: ReturnType<typeof themeColors>, _isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: { fontSize: 20, fontWeight: '700' },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    card: { borderRadius: 14, borderWidth: 1, padding: 20 },
    label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      fontSize: 16,
      fontFamily: 'monospace',
    },
    simBtn: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    simBtnText: { fontSize: 16, fontWeight: '600' },

    // Error
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    errorText: { fontSize: 13, fontWeight: '500', flex: 1 },

    // Summary cards
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
    },
    summaryLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      fontWeight: '500',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: 'monospace',
    },

    // Table
    tableCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
    },
    tableTitle: { fontSize: 15, fontWeight: '600' },
    tableSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 12 },
    tableWrap: { minWidth: 560 },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
    },
    th: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    td: {
      fontSize: 13,
      fontFamily: 'monospace',
    },
    colMonth: { width: 48 },
    colAmount: { width: 128 },
    alignRight: { textAlign: 'right' },
  })
}
