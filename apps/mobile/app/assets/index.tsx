import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
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

import FAB from '../../components/common/FAB'
import { apiFetch } from '../../lib/api'
import { formatKz } from '../../lib/format'

interface Asset {
  id: string
  name: string
  type: string
  current_value: number
  purchase_value?: number
  purchase_date?: string
  notes?: string
}

const ASSET_TYPES = [
  { value: 'vehicle', label: 'Veiculo', icon: 'car-outline' },
  { value: 'property', label: 'Imovel', icon: 'home-outline' },
  { value: 'electronics', label: 'Electronico', icon: 'laptop-outline' },
  { value: 'furniture', label: 'Mobilia', icon: 'bed-outline' },
  { value: 'other', label: 'Outro', icon: 'cube-outline' },
]

export default function AssetsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const sheetRef = useRef<BottomSheet>(null)

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [type, setType] = useState('other')
  const [currentValue, setCurrentValue] = useState('')
  const [creating, setCreating] = useState(false)

  const bg = isDark ? '#000' : '#f5f5f5'
  const card = isDark ? '#1a1a1a' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#f0f0f0'
  const accent = isDark ? '#fff' : '#000'

  const fetchAssets = useCallback(async () => {
    try {
      const data = await apiFetch<Asset[]>('/api/v1/assets/')
      setAssets(data)
    } catch {
      // May not have assets yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [])

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Erro', 'Preencha o nome do bem')
      return
    }
    const value = parseInt(currentValue) || 0
    if (value <= 0) {
      Alert.alert('Erro', 'Preencha o valor actual')
      return
    }
    setCreating(true)
    try {
      await apiFetch('/api/v1/assets/', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type,
          current_value: value,
        }),
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setName('')
      setCurrentValue('')
      setType('other')
      sheetRef.current?.close()
      fetchAssets()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar bem')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(asset: Asset) {
    Alert.alert('Eliminar bem', `Eliminar "${asset.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/v1/assets/${asset.id}`, { method: 'DELETE' })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            fetchAssets()
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao eliminar')
          }
        },
      },
    ])
  }

  const totalValue = assets.reduce((sum, a) => sum + a.current_value, 0)

  const getTypeIcon = (t: string) =>
    ASSET_TYPES.find((at) => at.value === t)?.icon || 'cube-outline'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Bens</Text>
      </View>

      {/* Total */}
      <View style={[styles.totalCard, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.totalLabel, { color: muted }]}>Valor total dos bens</Text>
        <Text style={[styles.totalAmount, { color: text }]}>{formatKz(totalValue)}</Text>
      </View>

      <FlatList
        data={assets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAssets} />}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.assetRow, { backgroundColor: card, borderColor: border }]}
            onLongPress={() => handleDelete(item)}
          >
            <Ionicons name={getTypeIcon(item.type) as any} size={24} color={muted} />
            <View style={styles.assetInfo}>
              <Text style={[styles.assetName, { color: text }]}>{item.name}</Text>
              <Text style={[styles.assetType, { color: muted }]}>
                {ASSET_TYPES.find((t) => t.value === item.type)?.label || item.type}
              </Text>
            </View>
            <Text style={[styles.assetValue, { color: text }]}>{formatKz(item.current_value)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={muted} />
              <Text style={[styles.emptyText, { color: muted }]}>Nenhum bem registado</Text>
            </View>
          ) : null
        }
      />

      <FAB onPress={() => sheetRef.current?.expand()} />

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: card }}
        handleIndicatorStyle={{ backgroundColor: muted }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: text }]}>Novo bem</Text>

          <Text style={[styles.label, { color: muted }]}>Nome</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Toyota Hilux"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Tipo</Text>
          <View style={styles.typeRow}>
            {ASSET_TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[
                  styles.typeChip,
                  { borderColor: border },
                  type === t.value && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setType(t.value)}
              >
                <Text style={[
                  styles.typeChipText,
                  { color: type === t.value ? (isDark ? '#000' : '#fff') : muted },
                ]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Valor actual (Kz)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={currentValue}
            onChangeText={setCurrentValue}
            placeholder="0"
            placeholderTextColor={muted}
            keyboardType="number-pad"
          />

          <Pressable
            style={[styles.createBtn, { backgroundColor: accent }, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
          >
            <Text style={[styles.createBtnText, { color: isDark ? '#000' : '#fff' }]}>
              {creating ? 'A criar...' : 'Criar bem'}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  totalCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 13 },
  totalAmount: { fontSize: 28, fontWeight: '700', fontFamily: 'monospace', marginTop: 4 },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 80 },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 15, fontWeight: '600' },
  assetType: { fontSize: 12, marginTop: 2 },
  assetValue: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 14 },
  sheetContent: { padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 13, fontWeight: '500' },
  createBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  createBtnText: { fontSize: 16, fontWeight: '600' },
})
