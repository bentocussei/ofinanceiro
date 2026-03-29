import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { formatKz } from '../../lib/format'
import { Bill, useBillsStore } from '../../stores/bills'

const FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'once', label: 'Única vez' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string; bgDark: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706', bgDark: '#3d2e00' },
  paid: { bg: '#d1fae5', text: '#059669', bgDark: '#002e1a' },
  overdue: { bg: '#fee2e2', text: '#dc2626', bgDark: '#3d0000' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  overdue: 'Em atraso',
}

export default function BillsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { bills, isLoading, fetchBills, createBill, payBill, deleteBill } = useBillsStore()
  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['85%'], [])

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { fetchBills() }, [])
  const onRefresh = useCallback(() => fetchBills(), [])

  const resetForm = () => {
    setName(''); setAmount(''); setDueDay(''); setFrequency('monthly')
  }

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'O nome é obrigatório'); return }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Erro', 'Defina o valor'); return }
    if (!dueDay || parseInt(dueDay) < 1 || parseInt(dueDay) > 31) {
      Alert.alert('Erro', 'Defina um dia de vencimento válido (1-31)'); return
    }

    setIsSubmitting(true)
    try {
      await createBill({
        name: name.trim(),
        amount: Math.round(parseFloat(amount) * 100),
        due_day: parseInt(dueDay),
        frequency,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      resetForm()
      sheetRef.current?.close()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar a conta')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePay = (bill: Bill) => {
    Alert.alert('Pagar', `Marcar "${bill.name}" como paga?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Pagar',
        onPress: async () => {
          try {
            await payBill(bill.id)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível registar o pagamento')
          }
        },
      },
    ])
  }

  const handleDelete = (bill: Bill) => {
    Alert.alert('Eliminar', `Eliminar conta "${bill.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteBill(bill.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const getFrequencyLabel = (freq: string) =>
    FREQUENCIES.find((f) => f.value === freq)?.label || freq

  const renderItem = ({ item }: { item: Bill }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending

    return (
      <Pressable
        style={[styles.card, isDark && styles.cardDark]}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, isDark && styles.textLight]}>{item.name}</Text>
            <Text style={[styles.amount, isDark && styles.textLight]}>
              {formatKz(item.amount)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isDark ? statusColor.bgDark : statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>
              Dia {item.due_day}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="repeat-outline" size={14} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>
              {getFrequencyLabel(item.frequency)}
            </Text>
          </View>
        </View>

        {item.status !== 'paid' && (
          <Pressable style={styles.payBtn} onPress={() => handlePay(item)}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
            <Text style={styles.payBtnText}>Pagar</Text>
          </Pressable>
        )}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Contas a Pagar</Text>
        <Pressable
          style={[styles.addBtnHeader, isDark && styles.addBtnDark]}
          onPress={() => sheetRef.current?.expand()}
        >
          <Ionicons name="add" size={20} color="#3b82f6" />
        </Pressable>
      </View>

      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma conta registada</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Adicione as suas contas a pagar para nunca perder um vencimento
            </Text>
          </View>
        }
      />

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={isDark ? styles.sheetDark : styles.sheet}
        handleIndicatorStyle={{ backgroundColor: isDark ? '#666' : '#ccc' }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={[styles.sheetTitle, isDark && styles.textLight]}>Nova conta a pagar</Text>

          <Text style={[styles.label, isDark && styles.textMuted]}>Nome</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: Electricidade"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Valor (Kz)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="0"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Dia de vencimento</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: 15"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={dueDay}
            onChangeText={setDueDay}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Frequência</Text>
          <View style={styles.typeGrid}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f.value}
                style={[styles.typeChip, isDark && styles.typeChipDark, frequency === f.value && styles.typeSelected]}
                onPress={() => setFrequency(f.value)}
              >
                <Text style={[styles.typeLabel, frequency === f.value && styles.typeLabelSelected]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
            onPress={handleCreate}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>{isSubmitting ? 'A criar...' : 'Criar conta'}</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  addBtnHeader: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDark: { backgroundColor: '#1e3a5f' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardDark: { backgroundColor: '#1a1a1a' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  amount: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: '#666' },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  payBtnText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center' },
  sheet: { backgroundColor: '#fff' },
  sheetDark: { backgroundColor: '#1a1a1a' },
  sheetContent: { padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4, color: '#000' },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#000', backgroundColor: '#f9f9f9',
  },
  inputDark: { borderColor: '#333', backgroundColor: '#111', color: '#fff' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e5e5', minWidth: 80, backgroundColor: '#fff',
  },
  typeChipDark: { borderColor: '#333', backgroundColor: '#1a1a1a' },
  typeSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  typeLabel: { fontSize: 11, color: '#666' },
  typeLabelSelected: { color: '#3b82f6', fontWeight: '600' },
  submitBtn: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
