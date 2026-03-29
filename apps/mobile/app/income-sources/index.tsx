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
import { IncomeSource, useIncomeSourcesStore } from '../../stores/income-sources'

const SOURCE_TYPES = [
  { value: 'salary', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'rental', label: 'Renda' },
  { value: 'investment', label: 'Investimento' },
  { value: 'business', label: 'Negócio' },
  { value: 'other', label: 'Outro' },
]

const FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'once', label: 'Única vez' },
]

export default function IncomeSourcesScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { sources, isLoading, fetchSources, createSource, deleteSource } = useIncomeSourcesStore()
  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['85%'], [])

  const [name, setName] = useState('')
  const [type, setType] = useState('salary')
  const [expectedAmount, setExpectedAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [dayOfMonth, setDayOfMonth] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { fetchSources() }, [])
  const onRefresh = useCallback(() => fetchSources(), [])

  const resetForm = () => {
    setName(''); setType('salary'); setExpectedAmount(''); setFrequency('monthly'); setDayOfMonth('')
  }

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Erro', 'O nome é obrigatório'); return }
    if (!expectedAmount || parseFloat(expectedAmount) <= 0) { Alert.alert('Erro', 'Defina o valor esperado'); return }

    setIsSubmitting(true)
    try {
      await createSource({
        name: name.trim(),
        type,
        expected_amount: Math.round(parseFloat(expectedAmount) * 100),
        frequency,
        day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      resetForm()
      sheetRef.current?.close()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar o rendimento')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (item: IncomeSource) => {
    Alert.alert('Eliminar', `Eliminar rendimento "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await deleteSource(item.id)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
      },
    ])
  }

  const getFrequencyLabel = (freq: string) =>
    FREQUENCIES.find((f) => f.value === freq)?.label || freq

  const getTypeLabel = (t: string) =>
    SOURCE_TYPES.find((st) => st.value === t)?.label || t

  const renderItem = ({ item }: { item: IncomeSource }) => (
    <Pressable
      style={[styles.card, isDark && styles.cardDark]}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, isDark && styles.textLight]}>{item.name}</Text>
          <View style={[styles.typeBadge, isDark && { backgroundColor: '#1e3a5f' }]}>
            <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
          </View>
        </View>
        <Text style={[styles.amount, isDark && styles.textLight]}>
          {formatKz(item.expected_amount)}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="repeat-outline" size={14} color={isDark ? '#999' : '#666'} />
          <Text style={[styles.detailText, isDark && styles.textMuted]}>
            {getFrequencyLabel(item.frequency)}
          </Text>
        </View>
        {item.day_of_month != null && (
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.detailText, isDark && styles.textMuted]}>
              Dia {item.day_of_month}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  )

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Rendimentos</Text>
        <Pressable
          style={[styles.addBtn, isDark && styles.addBtnDark]}
          onPress={() => sheetRef.current?.expand()}
        >
          <Ionicons name="add" size={20} color="#3b82f6" />
        </Pressable>
      </View>

      <FlatList
        data={sources}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhum rendimento registado</Text>
            <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
              Adicione as suas fontes de rendimento para melhor controlo financeiro
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
          <Text style={[styles.sheetTitle, isDark && styles.textLight]}>Novo rendimento</Text>

          <Text style={[styles.label, isDark && styles.textMuted]}>Nome</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: Salário mensal"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, isDark && styles.textMuted]}>Tipo</Text>
          <View style={styles.typeGrid}>
            {SOURCE_TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.typeChip, isDark && styles.typeChipDark, type === t.value && styles.typeSelected]}
                onPress={() => setType(t.value)}
              >
                <Text style={[styles.typeLabel, type === t.value && styles.typeLabelSelected]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, isDark && styles.textMuted]}>Valor esperado (Kz)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="0"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={expectedAmount}
            onChangeText={setExpectedAmount}
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

          <Text style={[styles.label, isDark && styles.textMuted]}>Dia do mês (opcional)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: 25"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
          />

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
            onPress={handleCreate}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>{isSubmitting ? 'A criar...' : 'Criar rendimento'}</Text>
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
  cardName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  typeText: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  amount: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace', color: '#000' },
  detailsRow: { flexDirection: 'row', gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: '#666' },
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
