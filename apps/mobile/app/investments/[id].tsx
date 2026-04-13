import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'
import { colors, themeColors } from '../../lib/tokens'
import { Investment, useInvestmentsStore } from '../../stores/investments'

export default function InvestmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const { updateInvestment, deleteInvestment } = useInvestmentsStore()

  const [inv, setInv] = useState<Investment | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCurrentValue, setEditCurrentValue] = useState('')
  const [saving, setSaving] = useState(false)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

  useEffect(() => {
    if (id) {
      apiFetch<Investment>(`/api/v1/investments/${id}`)
        .then((data) => {
          setInv(data)
          setEditName(data.name)
          setEditCurrentValue(String(data.current_value / 100))
        })
        .catch(() => {
          Alert.alert('Erro', 'Investimento nao encontrado')
          router.back()
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  async function handleSave() {
    if (!inv) return
    setSaving(true)
    try {
      const valueCentavos = Math.round(parseFloat(editCurrentValue) * 100)
      await updateInvestment(inv.id, {
        name: editName.trim(),
        current_value: valueCentavos > 0 ? valueCentavos : undefined,
      })
      const updated = await apiFetch<Investment>(`/api/v1/investments/${inv.id}`)
      setInv(updated)
      setEditing(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!inv) return
    Alert.alert('Eliminar', `Eliminar "${inv.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteInvestment(inv.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.back()
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.loadingText, { color: muted }]}>A carregar...</Text>
      </SafeAreaView>
    )
  }
  if (!inv) return null

  const returnAmount = inv.current_value - inv.invested_amount
  const returnPct = inv.invested_amount > 0 ? (returnAmount / inv.invested_amount) * 100 : 0
  const isPositive = returnAmount >= 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Investimento</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setEditing(!editing)}>
            <Ionicons name={editing ? 'close' : 'pencil'} size={20} color={text} />
          </Pressable>
          <Pressable onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          {editing ? (
            <>
              <Text style={[styles.label, { color: muted }]}>Nome</Text>
              <TextInput
                style={[styles.input, { borderColor: border, color: text }]}
                value={editName}
                onChangeText={setEditName}
              />
              <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Valor actual (Kz)</Text>
              <TextInput
                style={[styles.input, { borderColor: border, color: text }]}
                value={editCurrentValue}
                onChangeText={setEditCurrentValue}
                keyboardType="numeric"
              />
              <Pressable
                style={[styles.saveBtn, { backgroundColor: accent }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.saveBtnText, { color: isDark ? colors.dark.bg : colors.light.bg }]}>
                  {saving ? 'A guardar...' : 'Guardar'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.invName, { color: text }]}>{inv.name}</Text>
              {inv.institution && (
                <Text style={[styles.invInstitution, { color: muted }]}>{inv.institution}</Text>
              )}

              <View style={styles.valuesRow}>
                <View style={styles.valueItem}>
                  <Text style={[styles.valueLabel, { color: muted }]}>Investido</Text>
                  <Text style={[styles.valueAmount, { color: text }]}>{formatKz(inv.invested_amount)}</Text>
                </View>
                <View style={styles.valueItem}>
                  <Text style={[styles.valueLabel, { color: muted }]}>Valor actual</Text>
                  <Text style={[styles.valueAmount, { color: text }]}>{formatKz(inv.current_value)}</Text>
                </View>
              </View>

              <View style={[styles.returnCard, { backgroundColor: tc.cardAlt }]}>
                <Ionicons
                  name={isPositive ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={isPositive ? colors.success : colors.error}
                />
                <View>
                  <Text style={[styles.returnAmount, { color: isPositive ? colors.success : colors.error }]}>
                    {isPositive ? '+' : ''}{formatKz(returnAmount)}
                  </Text>
                  <Text style={[styles.returnPct, { color: muted }]}>
                    {isPositive ? '+' : ''}{returnPct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {!editing && (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Row label="Tipo" value={inv.type} text={text} muted={muted} border={border} />
            {inv.interest_rate != null && (
              <Row label="Taxa de juro" value={`${inv.interest_rate}%`} text={text} muted={muted} border={border} />
            )}
            <Row label="Estado" value={inv.is_active ? 'Activo' : 'Inactivo'} text={text} muted={muted} border={border} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, text, muted, border }: { label: string; value: string; text: string; muted: string; border: string }) {
  return (
    <View style={[rowStyles.row, { borderBottomColor: border }]}>
      <Text style={[rowStyles.label, { color: muted }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: text }]}>{value}</Text>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
})

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 16 },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 20 },
  invName: { fontSize: 20, fontWeight: '700' },
  invInstitution: { fontSize: 14, marginTop: 2 },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  valueItem: {},
  valueLabel: { fontSize: 12 },
  valueAmount: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  returnCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: 10 },
  returnAmount: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  returnPct: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, fontSize: 16 },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
})
