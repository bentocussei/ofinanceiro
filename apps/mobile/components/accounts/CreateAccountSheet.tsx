import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { forwardRef, useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'

import { useAccountsStore } from '../../stores/accounts'

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Banco', icon: '🏦' },
  { value: 'digital_wallet', label: 'Carteira digital', icon: '📱' },
  { value: 'cash', label: 'Dinheiro', icon: '💵' },
  { value: 'savings', label: 'Poupança', icon: '🏦' },
  { value: 'investment', label: 'Investimento', icon: '📈' },
  { value: 'credit_card', label: 'Cartão de crédito', icon: '💳' },
  { value: 'loan', label: 'Empréstimo', icon: '📋' },
]

interface Props {
  onCreated?: () => void
}

const CreateAccountSheet = forwardRef<BottomSheet, Props>(({ onCreated }, ref) => {
  const isDark = useColorScheme() === 'dark'
  const snapPoints = useMemo(() => ['85%'], [])
  const { createAccount } = useAccountsStore()

  const [name, setName] = useState('')
  const [type, setType] = useState('bank')
  const [institution, setInstitution] = useState('')
  const [balance, setBalance] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setType('bank')
    setInstitution('')
    setBalance('')
  }

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome da conta é obrigatório')
      return
    }

    setIsSubmitting(true)
    try {
      const balanceCentavos = balance ? Math.round(parseFloat(balance.replace(/[^\d]/g, '')) * 100) : 0
      await createAccount({
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        balance: balanceCentavos,
        icon: ACCOUNT_TYPES.find((t) => t.value === type)?.icon,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      reset()
      ;(ref as any)?.current?.close()
      onCreated?.()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar a conta')
    } finally {
      setIsSubmitting(false)
    }
  }, [name, type, institution, balance])

  const inputStyle = [styles.input, isDark && styles.inputDark]
  const labelStyle = [styles.label, isDark && styles.textLight]

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={isDark ? styles.sheetDark : styles.sheet}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#666' : '#ccc' }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, isDark && styles.textLight]}>Nova conta</Text>

        {/* Nome */}
        <Text style={labelStyle}>Nome da conta</Text>
        <TextInput
          style={inputStyle}
          placeholder="Ex: BAI - Conta Corrente"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Tipo */}
        <Text style={labelStyle}>Tipo de conta</Text>
        <View style={styles.typeGrid}>
          {ACCOUNT_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[
                styles.typeOption,
                isDark && styles.typeOptionDark,
                type === t.value && styles.typeSelected,
              ]}
              onPress={() => {
                setType(t.value)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  isDark && styles.textMuted,
                  type === t.value && styles.typeLabelSelected,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Instituição */}
        <Text style={labelStyle}>Instituição (opcional)</Text>
        <TextInput
          style={inputStyle}
          placeholder="Ex: BAI, BFA, Multicaixa Express"
          placeholderTextColor="#999"
          value={institution}
          onChangeText={setInstitution}
        />

        {/* Saldo inicial */}
        <Text style={labelStyle}>Saldo inicial (Kz)</Text>
        <TextInput
          style={inputStyle}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={balance}
          onChangeText={setBalance}
        />

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? 'A criar...' : 'Criar conta'}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

CreateAccountSheet.displayName = 'CreateAccountSheet'
export default CreateAccountSheet

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#fff' },
  sheetDark: { backgroundColor: '#1a1a1a' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20, color: '#000' },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16, color: '#000', backgroundColor: '#f9f9f9',
  },
  inputDark: { borderColor: '#333', backgroundColor: '#111', color: '#fff' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e5e5', flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  typeOptionDark: { borderColor: '#333' },
  typeSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  typeIcon: { fontSize: 16 },
  typeLabel: { fontSize: 13, color: '#666' },
  typeLabelSelected: { color: '#3b82f6', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#000', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
