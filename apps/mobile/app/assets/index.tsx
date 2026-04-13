import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
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
import { colors, themeColors } from '../../lib/tokens'

interface Asset {
  id: string
  name: string
  type: string
  current_value: number
  purchase_value?: number
  purchase_date?: string
  notes?: string
  annual_change_rate?: number
  insurance_value?: number
  insurance_expiry?: string
  details?: Record<string, any>
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
  const [purchaseValue, setPurchaseValue] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [description, setDescription] = useState('')
  // Type-specific fields
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [plate, setPlate] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [kilometers, setKilometers] = useState('')
  const [rooms, setRooms] = useState('')
  const [parkingSpots, setParkingSpots] = useState('')
  // Financial tracking
  const [annualChangeRate, setAnnualChangeRate] = useState('')
  // Insurance
  const [insuranceValue, setInsuranceValue] = useState('')
  const [insuranceExpiry, setInsuranceExpiry] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.borderLight
  const accent = tc.text

  const fetchAssets = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: Asset[] }>('/api/v1/assets/')
      setAssets(res.items)
    } catch {
      // May not have assets yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [])

  function resetForm() {
    setName('')
    setCurrentValue('')
    setPurchaseValue('')
    setPurchaseDate('')
    setDescription('')
    setType('other')
    setBrand('')
    setModel('')
    setYear('')
    setPlate('')
    setAddress('')
    setArea('')
    setKilometers('')
    setRooms('')
    setParkingSpots('')
    setAnnualChangeRate('')
    setInsuranceValue('')
    setInsuranceExpiry('')
    setEditingAsset(null)
  }

  function handleEdit(asset: Asset) {
    setEditingAsset(asset)
    setName(asset.name)
    setType(asset.type)
    setCurrentValue(asset.current_value.toString())
    setPurchaseValue(asset.purchase_value ? (asset.purchase_value / 100).toString() : '')
    setPurchaseDate(asset.purchase_date || '')
    setDescription(asset.notes || '')
    setAnnualChangeRate(
      typeof asset.annual_change_rate === 'number' ? asset.annual_change_rate.toString() : '',
    )
    setInsuranceValue(
      typeof asset.insurance_value === 'number' ? (asset.insurance_value / 100).toString() : '',
    )
    setInsuranceExpiry(asset.insurance_expiry || '')
    const d = asset.details || {}
    setBrand(d.marca ? String(d.marca) : '')
    setModel(d.modelo ? String(d.modelo) : '')
    setYear(d.ano != null ? String(d.ano) : '')
    setPlate(d.matricula ? String(d.matricula) : '')
    setKilometers(d.quilometragem != null ? String(d.quilometragem) : '')
    setAddress(d.morada ? String(d.morada) : '')
    setArea(d.area_m2 != null ? String(d.area_m2) : '')
    setRooms(d.quartos != null ? String(d.quartos) : '')
    setParkingSpots(d.estacionamentos != null ? String(d.estacionamentos) : '')
    sheetRef.current?.expand()
  }

  function handleOpenCreate() {
    resetForm()
    sheetRef.current?.expand()
  }

  async function handleSubmit() {
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
      const details: Record<string, unknown> = {}
      if (type === 'vehicle') {
        if (brand.trim()) details.marca = brand.trim()
        if (model.trim()) details.modelo = model.trim()
        if (year.trim()) details.ano = parseInt(year)
        if (plate.trim()) details.matricula = plate.trim()
        if (kilometers.trim()) details.quilometragem = parseInt(kilometers)
      } else if (type === 'property') {
        if (address.trim()) details.morada = address.trim()
        if (area.trim()) details.area_m2 = parseFloat(area)
        if (rooms.trim()) details.quartos = parseInt(rooms)
        if (parkingSpots.trim()) details.estacionamentos = parseInt(parkingSpots)
      }

      const payload = {
        name: name.trim(),
        type,
        current_value: value,
        purchase_value: purchaseValue ? Math.round(parseFloat(purchaseValue) * 100) : undefined,
        purchase_date: purchaseDate.trim() || undefined,
        description: description.trim() || undefined,
        annual_change_rate: annualChangeRate.trim() ? parseFloat(annualChangeRate) : undefined,
        insurance_value: insuranceValue.trim()
          ? Math.round(parseFloat(insuranceValue) * 100)
          : undefined,
        insurance_expiry: insuranceExpiry.trim() || undefined,
        details: Object.keys(details).length > 0 ? details : undefined,
      }

      if (editingAsset) {
        await apiFetch(`/api/v1/assets/${editingAsset.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/api/v1/assets/', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      resetForm()
      sheetRef.current?.close()
      fetchAssets()
    } catch (error: any) {
      Alert.alert('Erro', error.message || (editingAsset ? 'Erro ao actualizar bem' : 'Erro ao criar bem'))
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
  const assetsWithPurchase = assets.filter((a) => typeof a.purchase_value === 'number' && a.purchase_value > 0)
  const totalPurchase = assetsWithPurchase.reduce((sum, a) => sum + (a.purchase_value || 0), 0)
  const totalCurrentForPurchase = assetsWithPurchase.reduce((sum, a) => sum + a.current_value, 0)
  const appreciation = totalCurrentForPurchase - totalPurchase
  const appreciationPct = totalPurchase > 0 ? (appreciation / totalPurchase) * 100 : 0
  const hasPurchaseData = assetsWithPurchase.length > 0

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

      {/* Summary cards */}
      {hasPurchaseData ? (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: card }]}>
            <Text style={[styles.summaryLabel, { color: muted }]}>Valor actual</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatKz(totalValue)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: card }]}>
            <Text style={[styles.summaryLabel, { color: muted }]}>Valor investido</Text>
            <Text style={[styles.summaryValue, { color: text }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatKz(totalPurchase)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: card }]}>
            <Text style={[styles.summaryLabel, { color: muted }]}>Valorização</Text>
            <Text
              style={[styles.summaryValue, { color: appreciation >= 0 ? colors.success : colors.error }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {appreciation >= 0 ? '+' : ''}{formatKz(appreciation)}
            </Text>
            <Text style={[styles.summaryPct, { color: appreciation >= 0 ? colors.success : colors.error }]}>
              {appreciation >= 0 ? '+' : ''}{appreciationPct.toFixed(1)}%
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.totalCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.totalLabel, { color: muted }]}>Valor total dos bens</Text>
          <Text style={[styles.totalAmount, { color: text }]}>{formatKz(totalValue)}</Text>
        </View>
      )}

      <FlatList
        data={assets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAssets} />}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.assetRow, { backgroundColor: card, borderColor: border }]}
            onPress={() => handleEdit(item)}
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

      <FAB onPress={handleOpenCreate} />

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['90%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: card }}
        handleIndicatorStyle={{ backgroundColor: muted }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: text }]}>{editingAsset ? 'Editar bem' : 'Novo bem'}</Text>

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
                  { color: type === t.value ? (isDark ? colors.dark.bg : colors.light.bg) : muted },
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

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Valor de compra (Kz, opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={purchaseValue}
            onChangeText={setPurchaseValue}
            placeholder="0"
            placeholderTextColor={muted}
            keyboardType="number-pad"
          />

          <Text style={[styles.label, { color: muted, marginTop: 12 }]}>Data de compra (opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={muted}
            keyboardType="numbers-and-punctuation"
          />

          {/* Type-specific: Vehicle */}
          {type === 'vehicle' && (
            <>
              <Text style={[styles.sectionLabel, { color: muted }]}>VEICULO</Text>
              <Text style={[styles.label, { color: muted }]}>Marca</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={brand} onChangeText={setBrand} placeholder="Ex: Toyota" placeholderTextColor={muted} />
              <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Modelo</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={model} onChangeText={setModel} placeholder="Ex: Hilux" placeholderTextColor={muted} />
              <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Ano</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={year} onChangeText={setYear} placeholder="2024" placeholderTextColor={muted} keyboardType="numeric" />
              <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Matricula</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={plate} onChangeText={setPlate} placeholder="LD-XX-XX-XX" placeholderTextColor={muted} />
              <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Quilometragem (km)</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={kilometers} onChangeText={setKilometers} placeholder="0" placeholderTextColor={muted} keyboardType="numeric" />
            </>
          )}

          {/* Type-specific: Property */}
          {type === 'property' && (
            <>
              <Text style={[styles.sectionLabel, { color: muted }]}>IMOVEL</Text>
              <Text style={[styles.label, { color: muted }]}>Morada</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={address} onChangeText={setAddress} placeholder="Endereco" placeholderTextColor={muted} />
              <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Area (m2)</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={area} onChangeText={setArea} placeholder="0" placeholderTextColor={muted} keyboardType="numeric" />
              <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Quartos</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={rooms} onChangeText={setRooms} placeholder="0" placeholderTextColor={muted} keyboardType="numeric" />
              <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Estacionamentos</Text>
              <TextInput style={[styles.input, { borderColor: border, color: text }]} value={parkingSpots} onChangeText={setParkingSpots} placeholder="0" placeholderTextColor={muted} keyboardType="numeric" />
            </>
          )}

          {/* Financial tracking */}
          <Text style={[styles.sectionLabel, { color: muted }]}>VALORIZACAO</Text>
          <Text style={[styles.label, { color: muted }]}>Taxa anual de valorizacao (%)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={annualChangeRate}
            onChangeText={setAnnualChangeRate}
            placeholder="0"
            placeholderTextColor={muted}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={[styles.helper, { color: muted }]}>Positiva se valoriza, negativa se deprecia</Text>

          {/* Insurance */}
          <Text style={[styles.sectionLabel, { color: muted }]}>SEGURO</Text>
          <Text style={[styles.label, { color: muted }]}>Valor do seguro (Kz, opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={insuranceValue}
            onChangeText={setInsuranceValue}
            placeholder="0"
            placeholderTextColor={muted}
            keyboardType="number-pad"
          />
          <Text style={[styles.label, { color: muted, marginTop: 8 }]}>Validade do seguro (opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            value={insuranceExpiry}
            onChangeText={setInsuranceExpiry}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={muted}
            keyboardType="numbers-and-punctuation"
          />

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: muted }]}>NOTAS</Text>
          <Text style={[styles.label, { color: muted }]}>Descricao (opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: border, color: text, minHeight: 50, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detalhes sobre o bem"
            placeholderTextColor={muted}
            multiline
          />

          <Pressable
            style={[styles.createBtn, { backgroundColor: accent }, creating && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={creating}
          >
            <Text style={[styles.createBtnText, { color: isDark ? colors.dark.bg : colors.light.bg }]}>
              {creating ? (editingAsset ? 'A actualizar...' : 'A criar...') : (editingAsset ? 'Guardar alteracoes' : 'Criar bem')}
            </Text>
          </Pressable>
        </BottomSheetScrollView>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  summaryPct: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginTop: 2,
  },
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
  sheetContent: { padding: 20, paddingBottom: 60 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  helper: {
    fontSize: 11,
    marginTop: 4,
  },
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
