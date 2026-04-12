import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View, useColorScheme, Modal, FlatList } from 'react-native'

import { apiFetch } from '../../lib/api'
import {
  AppContext,
  getContext,
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
    loadContext().then((ctx) => {
      setCurrent(ctx)
    })
    // Fetch family info
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

  const isFamily = isFamilyContext()
  const label = isFamily && family ? family.name : 'Pessoal'
  const icon = isFamily ? 'people' : 'person'

  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const card = isDark ? '#1a1a1a' : '#fff'
  const border = isDark ? '#333' : '#e5e5e5'

  // If no family, don't show switcher
  if (!family) return null

  const options: { label: string; ctx: AppContext; icon: string }[] = [
    { label: 'Pessoal', ctx: 'personal', icon: 'person' },
    { label: family.name, ctx: `family:${family.id}`, icon: 'people' },
  ]

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setShowPicker(true)}>
        <Ionicons name={icon as any} size={18} color={text} />
        <Text style={[styles.triggerText, { color: text }]}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={muted} />
      </Pressable>

      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setShowPicker(false)}>
          <View style={[styles.picker, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.pickerTitle, { color: text }]}>Escolher contexto</Text>
            {options.map((opt) => (
              <Pressable
                key={opt.ctx}
                style={[
                  styles.option,
                  current === opt.ctx && { backgroundColor: isDark ? '#333' : '#f0f0f0' },
                ]}
                onPress={() => switchTo(opt.ctx)}
              >
                <Ionicons name={opt.icon as any} size={20} color={text} />
                <Text style={[styles.optionLabel, { color: text }]}>{opt.label}</Text>
                {current === opt.ctx && (
                  <Ionicons name="checkmark" size={20} color="#22c55e" />
                )}
              </Pressable>
            ))}
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  triggerText: { fontSize: 14, fontWeight: '600' },
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
