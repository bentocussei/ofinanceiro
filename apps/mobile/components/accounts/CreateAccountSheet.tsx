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

import IconDisplay from '../common/IconDisplay'
import { colors, themeColors } from '../../lib/tokens'
import { useAccountsStore } from '../../stores/accounts'

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Banco' },
  { value: 'digital_wallet', label: 'Carteira digital' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'savings', label: 'Poupança' },
  { value: 'investment', label: 'Investimento' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'loan', label: 'Empréstimo' },
]

const USAGE_TYPES = [
  { value: 'personal', label: 'Pessoal' },
  { value: 'business', label: 'Negócio' },
  { value: 'joint', label: 'Conjunta' },
  { value: 'savings', label: 'Poupança' },
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
  const [currency, setCurrency] = useState('AOA')
  const [holderName, setHolderName] = useState('')
  const [iban, setIban] = useState('')
  const [nib, setNib] = useState('')
  const [swift, setSwift] = useState('')
  const [usageType, setUsageType] = useState('personal')
  const [creditLimit, setCreditLimit] = useState('')
  const [lowBalanceAlert, setLowBalanceAlert] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setType('bank')
    setInstitution('')
    setBalance('')
    setCurrency('AOA')
    setHolderName('')
    setIban('')
    setNib('')
    setSwift('')
    setUsageType('personal')
    setCreditLimit('')
    setLowBalanceAlert('')
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
        currency,
        institution: institution.trim() || undefined,
        balance: balanceCentavos,
        icon: type,
        holder_name: holderName.trim() || undefined,
        iban: iban.trim() || undefined,
        nib: nib.trim() || undefined,
        swift: swift.trim() || undefined,
        usage_type: usageType,
        credit_limit: type === 'credit_card' && creditLimit ? Math.round(parseFloat(creditLimit) * 100) : undefined,
        low_balance_alert: lowBalanceAlert ? Math.round(parseFloat(lowBalanceAlert) * 100) : undefined,
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
  }, [name, type, institution, balance, iban, nib, swift, usageType, creditLimit])

  const tc = themeColors(isDark)
  const inputStyle = [styles.input, isDark && styles.inputDark]
  const labelStyle = [styles.label, isDark && styles.textLight]

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={isDark ? styles.sheetDark : styles.sheet}
      handleIndicatorStyle={{ backgroundColor: tc.handle }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, isDark && styles.textLight]}>Nova conta</Text>

        {/* Nome */}
        <Text style={labelStyle}>Nome da conta</Text>
        <TextInput
          style={inputStyle}
          placeholder="Ex: BAI - Conta Corrente"
          placeholderTextColor={tc.textMuted}
          value={name}
          onChangeText={setName}
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
              <IconDisplay name={t.value} size={16} color={type === t.value ? colors.primary : tc.textSecondary} />
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
          placeholderTextColor={tc.textMuted}
          value={institution}
          onChangeText={setInstitution}
        />

        {/* Moeda */}
        <Text style={labelStyle}>Moeda</Text>
        <View style={styles.typeGrid}>
          {['AOA', 'USD', 'EUR', 'MZN', 'CVE'].map((c) => (
            <Pressable
              key={c}
              style={[styles.typeOption, isDark && styles.typeOptionDark, currency === c && styles.typeSelected]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.typeLabel, currency === c && styles.typeLabelSelected]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        {/* Titular */}
        <Text style={labelStyle}>Titular da conta (opcional)</Text>
        <TextInput
          style={inputStyle}
          placeholder="Nome do titular"
          placeholderTextColor={tc.textMuted}
          value={holderName}
          onChangeText={setHolderName}
        />

        {/* Saldo inicial */}
        <Text style={labelStyle}>Saldo inicial (Kz)</Text>
        <TextInput
          style={inputStyle}
          placeholder="0"
          placeholderTextColor={tc.textMuted}
          keyboardType="numeric"
          value={balance}
          onChangeText={setBalance}
        />

        {/* Utilização */}
        <Text style={labelStyle}>Utilização</Text>
        <View style={styles.typeGrid}>
          {USAGE_TYPES.map((u) => (
            <Pressable
              key={u.value}
              style={[
                styles.typeOption,
                isDark && styles.typeOptionDark,
                usageType === u.value && styles.typeSelected,
              ]}
              onPress={() => setUsageType(u.value)}
            >
              <Text
                style={[
                  styles.typeLabel,
                  isDark && styles.textMuted,
                  usageType === u.value && styles.typeLabelSelected,
                ]}
              >
                {u.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* IBAN */}
        <Text style={labelStyle}>IBAN (opcional)</Text>
        <TextInput
          style={inputStyle}
          placeholder="AO00 0000 0000 0000 0000 0000 0"
          placeholderTextColor={tc.textMuted}
          value={iban}
          onChangeText={setIban}
          autoCapitalize="characters"
        />

        {/* NIB */}
        <Text style={labelStyle}>NIB (opcional)</Text>
        <TextInput
          style={inputStyle}
          placeholder="0000 0000 0000 0000 0000 0"
          placeholderTextColor={tc.textMuted}
          value={nib}
          onChangeText={setNib}
          keyboardType="numeric"
        />

        {/* SWIFT */}
        <Text style={labelStyle}>SWIFT/BIC (opcional)</Text>
        <TextInput
          style={inputStyle}
          placeholder="Ex: BAIAAOLU"
          placeholderTextColor={tc.textMuted}
          value={swift}
          onChangeText={setSwift}
          autoCapitalize="characters"
        />

        {/* Limite de crédito (apenas para cartão de crédito) */}
        {type === 'credit_card' && (
          <>
            <Text style={labelStyle}>Limite de crédito (Kz)</Text>
            <TextInput
              style={inputStyle}
              placeholder="0"
              placeholderTextColor={tc.textMuted}
              keyboardType="numeric"
              value={creditLimit}
              onChangeText={setCreditLimit}
            />
          </>
        )}

        {/* Alerta saldo baixo */}
        <Text style={labelStyle}>Alerta de saldo baixo (Kz)</Text>
        <TextInput
          style={inputStyle}
          placeholder="0 (desactivado)"
          placeholderTextColor={tc.textMuted}
          keyboardType="numeric"
          value={lowBalanceAlert}
          onChangeText={setLowBalanceAlert}
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
  sheet: { backgroundColor: colors.light.card },
  sheetDark: { backgroundColor: colors.dark.card },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20, color: colors.light.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.light.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: colors.light.border, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16, color: colors.light.text, backgroundColor: colors.light.input,
  },
  inputDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.input, color: colors.dark.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.light.border, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  typeOptionDark: { borderColor: colors.dark.border },
  typeSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeIcon: { fontSize: 16 },
  typeLabel: { fontSize: 13, color: colors.light.textSecondary },
  typeLabelSelected: { color: colors.primary, fontWeight: '600' },
  submitBtn: {
    backgroundColor: colors.light.text, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.dark.text, fontSize: 16, fontWeight: '600' },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.light.textMuted },
})
