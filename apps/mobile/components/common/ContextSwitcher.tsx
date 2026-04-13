import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View, useColorScheme, Modal } from 'react-native'

import { apiFetch } from '../../lib/api'
import { colors, themeColors } from '../../lib/tokens'
import {
  AppContext,
  isFamilyContext,
  loadContext,
  setContext,
} from '../../lib/context'

interface Family {
  id: string
  name: string
}

interface Props {
  onContextChange?: () => void
}

export default function ContextSwitcher({ onContextChange }: Props) {
  const isDark = useColorScheme() === 'dark'
  const [current, setCurrent] = useState<AppContext>('personal')
  const [family, setFamily] = useState<Family | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    loadContext().then((ctx) => setCurrent(ctx))
    apiFetch<Family>('/api/v1/families/me')
      .then(setFamily)
      .catch(() => setFamily(null))
  }, [])

  async function switchTo(ctx: AppContext) {
    await setContext(ctx)
    setCurrent(ctx)
    setShowPicker(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onContextChange?.()
  }

  const isFamily = current.startsWith('family:')
  const label = isFamily && family ? family.name : 'Pessoal'
  const icon = isFamily ? 'people' : 'person'

  const tc = themeColors(isDark)

  // If no family, don't show switcher
  if (!family) return null

  const options: { label: string; ctx: AppContext; icon: string }[] = [
    { label: 'Pessoal', ctx: 'personal', icon: 'person' },
    { label: family.name, ctx: `family:${family.id}`, icon: 'people' },
  ]

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: isFamily ? colors.primaryLight : tc.cardAlt }]}
        onPress={() => setShowPicker(true)}
      >
        <Ionicons name={icon as any} size={14} color={isFamily ? colors.primary : tc.textSecondary} />
        <Text
          style={[styles.triggerText, { color: isFamily ? colors.primary : tc.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Ionicons name="chevron-down" size={12} color={isFamily ? colors.primary : tc.textMuted} />
      </Pressable>

      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setShowPicker(false)}>
          <View style={[styles.picker, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <Text style={[styles.pickerTitle, { color: tc.text }]}>Escolher contexto</Text>
            {options.map((opt) => {
              const isActive = current === opt.ctx
              return (
                <Pressable
                  key={opt.ctx}
                  style={[styles.option, isActive && { backgroundColor: colors.primaryLight }]}
                  onPress={() => switchTo(opt.ctx)}
                >
                  <Ionicons name={opt.icon as any} size={20} color={isActive ? colors.primary : tc.icon} />
                  <Text style={[styles.optionLabel, { color: isActive ? colors.primary : tc.text }]}>
                    {opt.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  triggerText: { fontSize: 13, fontWeight: '600', maxWidth: 100 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
})
