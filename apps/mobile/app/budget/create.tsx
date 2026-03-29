import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
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

import IconDisplay from '../../components/common/IconDisplay'
import { formatKz } from '../../lib/format'
import { useBudgetsStore } from '../../stores/budgets'
import { Category, useCategoriesStore } from '../../stores/categories'

const METHODS = [
  { value: 'category', label: 'Por categoria', desc: 'Define limite por cada categoria' },
  { value: 'fifty_thirty_twenty', label: '50/30/20', desc: 'Necessidades/Desejos/Poupança' },
  { value: 'envelope', label: 'Envelopes', desc: 'Valor fixo por categoria' },
  { value: 'flex', label: 'Flexível', desc: 'Limite total sem categorias' },
  { value: 'zero_based', label: 'Base zero', desc: 'Cada Kz tem destino' },
]

export default function CreateBudgetScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { createBudget } = useBudgetsStore()
  const { categories, fetchCategories, getParentCategories } = useCategoriesStore()

  const [name, setName] = useState('')
  const [method, setMethod] = useState('category')
  const [totalLimit, setTotalLimit] = useState('')
  const [items, setItems] = useState<{ category_id: string; limit: string; name: string; icon: string | null }[]>([])
  const [alertThreshold, setAlertThreshold] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const expenseCategories = getParentCategories('expense')

  const addCategory = (cat: Category) => {
    if (items.find((i) => i.category_id === cat.id)) return
    setItems([...items, { category_id: cat.id, limit: '', name: cat.name, icon: cat.icon }])
  }

  const updateItemLimit = (catId: string, limit: string) => {
    setItems(items.map((i) => (i.category_id === catId ? { ...i, limit } : i)))
  }

  const removeItem = (catId: string) => {
    setItems(items.filter((i) => i.category_id !== catId))
  }

  const handleSubmit = async () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setIsSubmitting(true)
    try {
      const budgetItems = items
        .filter((i) => i.limit && parseFloat(i.limit) > 0)
        .map((i) => ({
          category_id: i.category_id,
          limit_amount: Math.round(parseFloat(i.limit) * 100),
        }))

      await createBudget({
        name: name.trim() || `${start.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })}`,
        method,
        period_start: start.toISOString().split('T')[0],
        period_end: end.toISOString().split('T')[0],
        total_limit: totalLimit ? Math.round(parseFloat(totalLimit) * 100) : undefined,
        items: budgetItems,
        alert_threshold: alertThreshold ? parseInt(alertThreshold) : undefined,
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar o orçamento')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Novo orçamento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Name */}
        <Text style={[styles.label, isDark && styles.textMuted]}>Nome (opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: Março 2026"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />

        {/* Method */}
        <Text style={[styles.label, isDark && styles.textMuted]}>Método</Text>
        <View style={styles.methodGrid}>
          {METHODS.map((m) => (
            <Pressable
              key={m.value}
              style={[styles.methodCard, isDark && styles.methodCardDark, method === m.value && styles.methodSelected]}
              onPress={() => setMethod(m.value)}
            >
              <Text style={[styles.methodLabel, method === m.value && styles.methodLabelSelected]}>
                {m.label}
              </Text>
              <Text style={[styles.methodDesc, isDark && styles.textMuted]}>{m.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Total Limit (for flex methods) */}
        {(method === 'flex' || method === 'fifty_thirty_twenty') && (
          <>
            <Text style={[styles.label, isDark && styles.textMuted]}>Limite total (Kz)</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={totalLimit}
              onChangeText={setTotalLimit}
            />
          </>
        )}

        {/* Category Limits */}
        {method === 'category' && (
          <>
            <Text style={[styles.label, isDark && styles.textMuted]}>Limites por categoria</Text>

            {/* Added items */}
            {items.map((item) => (
              <View key={item.category_id} style={[styles.itemRow, isDark && styles.itemRowDark]}>
                <Pressable onPress={() => removeItem(item.category_id)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </Pressable>
                <Text style={[styles.itemName, isDark && styles.textLight]}>
                  <IconDisplay name={item.name} size={14} color={isDark ? '#fff' : '#000'} /> {item.name}
                </Text>
                <TextInput
                  style={[styles.itemInput, isDark && styles.inputDark]}
                  placeholder="Limite"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={item.limit}
                  onChangeText={(v) => updateItemLimit(item.category_id, v)}
                />
                <Text style={[styles.kzSuffix, isDark && styles.textMuted]}>Kz</Text>
              </View>
            ))}

            {/* Add category buttons */}
            <View style={styles.catGrid}>
              {expenseCategories
                .filter((c) => !items.find((i) => i.category_id === c.id))
                .map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[styles.catChip, isDark && styles.catChipDark]}
                    onPress={() => addCategory(cat)}
                  >
                    <IconDisplay name={cat.name} size={14} color={isDark ? '#999' : '#666'} />
                    <Text style={[styles.catLabel, isDark && styles.textMuted]}>{cat.name}</Text>
                  </Pressable>
                ))}
            </View>
          </>
        )}

        {/* Limiar de alerta */}
        <Text style={[styles.label, isDark && styles.textMuted]}>Limiar de alerta (%, opcional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Ex: 80 (alerta ao atingir 80% do limite)"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={alertThreshold}
          onChangeText={setAlertThreshold}
        />

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>{isSubmitting ? 'A criar...' : 'Criar orçamento'}</Text>
        </Pressable>
      </ScrollView>
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
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#000', backgroundColor: '#fff',
  },
  inputDark: { borderColor: '#333', backgroundColor: '#111', color: '#fff' },
  methodGrid: { gap: 8 },
  methodCard: {
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fff',
  },
  methodCardDark: { borderColor: '#333', backgroundColor: '#1a1a1a' },
  methodSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  methodLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  methodLabelSelected: { color: '#3b82f6' },
  methodDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 6,
  },
  itemRowDark: { backgroundColor: '#1a1a1a' },
  itemName: { flex: 1, fontSize: 14, color: '#000' },
  itemInput: {
    width: 100, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: 'monospace',
    textAlign: 'right', color: '#000',
  },
  kzSuffix: { fontSize: 12, color: '#999' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fff',
  },
  catChipDark: { borderColor: '#333', backgroundColor: '#1a1a1a' },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 11, color: '#666' },
  submitBtn: {
    backgroundColor: '#000', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
