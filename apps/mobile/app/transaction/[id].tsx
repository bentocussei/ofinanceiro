import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
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
import { formatKz, formatDateFull } from '../../lib/format'
import { useTransactionsStore } from '../../stores/transactions'

interface TransactionDetail {
  id: string
  account_id: string
  category_id: string | null
  amount: number
  type: 'income' | 'expense' | 'transfer'
  description: string | null
  merchant: string | null
  tags: string[]
  notes: string | null
  transaction_date: string
  is_recurring: boolean
  needs_review: boolean
  is_private: boolean
  created_at: string
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const { deleteTransaction } = useTransactionsStore()

  const [txn, setTxn] = useState<TransactionDetail | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (id) {
      apiFetch<TransactionDetail>(`/api/v1/transactions/${id}`)
        .then((data) => {
          setTxn(data)
          setEditDescription(data.description || '')
          setEditAmount(String(data.amount / 100))
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
          Alert.alert('Erro', 'Transacção não encontrada')
          router.back()
        })
    }
  }, [id])

  const handleSave = async () => {
    if (!txn) return
    setIsSaving(true)
    try {
      const amountCentavos = Math.round(parseFloat(editAmount) * 100)
      const updated = await apiFetch<TransactionDetail>(`/api/v1/transactions/${txn.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: editDescription.trim() || undefined,
          amount: amountCentavos > 0 ? amountCentavos : undefined,
        }),
      })
      setTxn(updated)
      setIsEditing(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível actualizar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (!txn) return
    Alert.alert('Eliminar', 'Tem a certeza que deseja eliminar esta transacção?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(txn.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.back()
        },
      },
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, isDark && styles.textMuted]}>A carregar...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!txn) return null

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>Detalhe</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setIsEditing(!isEditing)} style={styles.actionBtn}>
            <Ionicons name={isEditing ? 'close' : 'pencil'} size={20} color={isDark ? '#fff' : '#000'} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Amount */}
        <View style={[styles.amountCard, isDark && styles.cardDark]}>
          <Text style={[styles.typeLabel, txn.type === 'income' ? styles.income : styles.expense]}>
            {txn.type === 'income' ? 'Receita' : txn.type === 'expense' ? 'Despesa' : 'Transferência'}
          </Text>
          {isEditing ? (
            <TextInput
              style={[styles.amountEdit, isDark && styles.textLight]}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
            />
          ) : (
            <Text style={[styles.amount, isDark && styles.textLight]}>
              {txn.type === 'income' ? '+' : '-'}{formatKz(txn.amount)}
            </Text>
          )}
          <Text style={[styles.date, isDark && styles.textMuted]}>
            {formatDateFull(txn.transaction_date)}
          </Text>
        </View>

        {/* Details */}
        <View style={[styles.detailCard, isDark && styles.cardDark]}>
          <DetailRow label="Descrição" isDark={isDark}>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, isDark && styles.editInputDark]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Descrição"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={[styles.detailValue, isDark && styles.textLight]}>
                {txn.description || '—'}
              </Text>
            )}
          </DetailRow>

          {txn.merchant && (
            <DetailRow label="Comerciante" isDark={isDark}>
              <Text style={[styles.detailValue, isDark && styles.textLight]}>{txn.merchant}</Text>
            </DetailRow>
          )}

          {txn.notes && (
            <DetailRow label="Notas" isDark={isDark}>
              <Text style={[styles.detailValue, isDark && styles.textLight]}>{txn.notes}</Text>
            </DetailRow>
          )}

          {txn.tags.length > 0 && (
            <DetailRow label="Tags" isDark={isDark}>
              <View style={styles.tagsRow}>
                {txn.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </DetailRow>
          )}

          <DetailRow label="Recorrente" isDark={isDark}>
            <Text style={[styles.detailValue, isDark && styles.textLight]}>
              {txn.is_recurring ? 'Sim' : 'Não'}
            </Text>
          </DetailRow>
        </View>

        {/* Save button in edit mode */}
        {isEditing && (
          <Pressable
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{isSaving ? 'A guardar...' : 'Guardar alterações'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function DetailRow({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, isDark && styles.textMuted]}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#999' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  content: { padding: 16, gap: 16 },
  amountCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center',
  },
  cardDark: { backgroundColor: '#1a1a1a' },
  typeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  amount: { fontSize: 36, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  amountEdit: {
    fontSize: 36, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: '#3b82f6', paddingVertical: 4, color: '#000',
  },
  date: { fontSize: 14, color: '#999', marginTop: 8 },
  detailCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  detailRow: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  detailValue: { fontSize: 15, color: '#000' },
  editInput: {
    fontSize: 15, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, color: '#000',
  },
  editInputDark: { borderColor: '#333', color: '#fff' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: '#666' },
  income: { color: '#22c55e' },
  expense: { color: '#ef4444' },
  saveBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
