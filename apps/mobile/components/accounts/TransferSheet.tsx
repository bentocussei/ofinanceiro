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
import { apiFetch } from '../../lib/api'
import { colors, themeColors } from '../../lib/tokens'
import { Account, useAccountsStore } from '../../stores/accounts'

interface Props {
  onTransferred?: () => void
}

const TransferSheet = forwardRef<BottomSheet, Props>(({ onTransferred }, ref) => {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const snapPoints = useMemo(() => ['75%'], [])
  const { accounts, fetchSummary } = useAccountsStore()

  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setFromId(null)
    setToId(null)
    setAmount('')
    setDescription('')
  }

  const handleSubmit = useCallback(async () => {
    if (!fromId || !toId) {
      Alert.alert('Erro', 'Seleccione a conta de origem e destino')
      return
    }
    if (fromId === toId) {
      Alert.alert('Erro', 'As contas devem ser diferentes')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Introduza um valor válido')
      return
    }

    setIsSubmitting(true)
    try {
      const amountCentavos = Math.round(parseFloat(amount) * 100)
      await apiFetch('/api/v1/accounts/transfer', {
        method: 'POST',
        body: JSON.stringify({
          from_account_id: fromId,
          to_account_id: toId,
          amount: amountCentavos,
          description: description.trim() || undefined,
        }),
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      reset()
      ;(ref as any)?.current?.close()
      fetchSummary()
      onTransferred?.()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível realizar a transferência')
    } finally {
      setIsSubmitting(false)
    }
  }, [fromId, toId, amount, description])

  const renderAccountPicker = (
    label: string,
    selectedId: string | null,
    onSelect: (id: string) => void,
    excludeId: string | null,
  ) => (
    <View>
      <Text style={[styles.label, isDark && styles.textMuted]}>{label}</Text>
      <View style={styles.accountGrid}>
        {accounts
          .filter((a) => a.id !== excludeId)
          .map((acc) => (
            <Pressable
              key={acc.id}
              style={[
                styles.accountChip,
                isDark && styles.accountChipDark,
                selectedId === acc.id && styles.accountChipSelected,
              ]}
              onPress={() => onSelect(acc.id)}
            >
              <IconDisplay name={acc.icon || 'default'} size={16} color={selectedId === acc.id ? colors.primary : tc.textSecondary} />
              <Text
                style={[
                  styles.accountName,
                  isDark && styles.textMuted,
                  selectedId === acc.id && styles.accountNameSelected,
                ]}
              >
                {acc.name}
              </Text>
            </Pressable>
          ))}
      </View>
    </View>
  )

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
        <Text style={[styles.title, isDark && styles.textLight]}>Transferência</Text>

        {accounts.length < 2 ? (
          <Text style={[styles.emptyText, isDark && styles.textMuted]}>
            Precisa de pelo menos 2 contas para fazer transferências.
          </Text>
        ) : (
          <>
            {renderAccountPicker('De (origem)', fromId, setFromId, toId)}

            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>↓</Text>
            </View>

            {renderAccountPicker('Para (destino)', toId, setToId, fromId)}

            <Text style={[styles.label, isDark && styles.textMuted]}>Valor (Kz)</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="0"
              placeholderTextColor={tc.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={[styles.label, isDark && styles.textMuted]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Ex: Poupar para férias"
              placeholderTextColor={tc.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            <Pressable
              style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? 'A transferir...' : 'Transferir'}
              </Text>
            </Pressable>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

TransferSheet.displayName = 'TransferSheet'
export default TransferSheet

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.light.card },
  sheetDark: { backgroundColor: colors.dark.card },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: colors.light.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.light.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: colors.light.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.light.text, backgroundColor: colors.light.input,
  },
  inputDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.input, color: colors.dark.text },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.light.border,
  },
  accountChipDark: { borderColor: colors.dark.border },
  accountChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  accountIcon: { fontSize: 16 },
  accountName: { fontSize: 13, color: colors.light.textSecondary },
  accountNameSelected: { color: colors.primary, fontWeight: '600' },
  arrowContainer: { alignItems: 'center', paddingVertical: 8 },
  arrow: { fontSize: 24, color: colors.light.textMuted },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.dark.text, fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 15, color: colors.light.textMuted, textAlign: 'center', paddingVertical: 40 },
  textLight: { color: colors.dark.text },
  textMuted: { color: colors.light.textMuted },
})
