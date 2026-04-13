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
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { formatKz } from '../../lib/format'
import { Debt, useDebtsStore } from '../../stores/debts'

export default function DebtsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { debts, isLoading, fetchDebts, registerPayment, deleteDebt } = useDebtsStore()
  const [payDebtId, setPayDebtId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  useEffect(() => { fetchDebts() }, [])
  const onRefresh = useCallback(() => fetchDebts(), [])

  const handleDelete = (debt: Debt) => {
    Alert.alert('Eliminar', `Eliminar dívida "${debt.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteDebt(debt.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const handlePayment = async () => {
    if (!payDebtId || !payAmount) return
    const amount = Math.round(parseFloat(payAmount) * 100)
    if (amount <= 0) return

    try {
      const today = new Date().toISOString().split('T')[0]
      await registerPayment(payDebtId, amount, today)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setPayDebtId(null)
      setPayAmount('')
    } catch (error: any) {
      Alert.alert('Erro', error.message)
    }
  }

  const renderDebt = ({ item }: { item: Debt }) => (
    <Pressable
      style={[styles.card, isDark && styles.cardDark]}
      onPress={() => router.push(`/debts/${item.id}`)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, isDark && styles.textLight]}>{item.name}</Text>
          {item.creditor && (
            <Text style={[styles.creditor, isDark && styles.textMuted]}>{item.creditor}</Text>
          )}
        </View>
        <View style={[styles.typeBadge, isDark && { backgroundColor: '#1e3a5f' }]}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={[styles.balanceLabel, isDark && styles.textMuted]}>Saldo actual</Text>
        <Text style={[styles.balanceValue, isDark && styles.textLight]}>
          {formatKz(item.current_balance)}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        {item.interest_rate != null && (
          <View style={styles.detailItem}>
            <Ionicons name="trending-up-outline" size={14} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>{item.interest_rate}%</Text>
          </View>
        )}
        {item.monthly_payment != null && (
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>
              {formatKz(item.monthly_payment)}/mês
            </Text>
          </View>
        )}
      </View>

      {/* Payment section */}
      {payDebtId === item.id ? (
        <View style={styles.payRow}>
          <TextInput
            style={[styles.payInput, isDark && styles.inputDark]}
            placeholder="Valor Kz"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={payAmount}
            onChangeText={setPayAmount}
            autoFocus
          />
          <Pressable style={styles.payBtn} onPress={handlePayment}>
            <Text style={styles.payBtnText}>Pagar</Text>
          </Pressable>
          <Pressable onPress={() => setPayDebtId(null)}>
            <Ionicons name="close" size={20} color="#999" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.addPayBtn}
          onPress={() => { setPayDebtId(item.id); setPayAmount('') }}
        >
          <Ionicons name="cash-outline" size={18} color="#3b82f6" />
          <Text style={styles.addPayText}>Registar pagamento</Text>
        </Pressable>
      )}
    </Pressable>
  )

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Dividas</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={[styles.addBtn, isDark && styles.addBtnDark]}
            onPress={() => router.push('/debts/simulator')}
          >
            <Ionicons name="calculator-outline" size={18} color="#f59e0b" />
          </Pressable>
          <Pressable
            style={[styles.addBtn, isDark && styles.addBtnDark]}
            onPress={() => router.push('/debts/create')}
          >
            <Ionicons name="add" size={20} color="#3b82f6" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        renderItem={renderDebt}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma dívida registada</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Registe as suas dívidas para acompanhar os pagamentos
            </Text>
          </View>
        }
      />
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
  addBtn: {
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
  cardName: { fontSize: 16, fontWeight: '600', color: '#000' },
  creditor: { fontSize: 13, color: '#999', marginTop: 2 },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typeText: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  amountRow: { marginBottom: 8 },
  balanceLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  balanceValue: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: '#666' },
  addPayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addPayText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  payInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: 'monospace', color: '#000',
  },
  inputDark: { borderColor: '#333', color: '#fff', backgroundColor: '#111' },
  payBtn: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
