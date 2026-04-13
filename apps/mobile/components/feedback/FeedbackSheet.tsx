import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { forwardRef, useState } from 'react'
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'

import { apiFetch } from '../../lib/api'
import { colors, themeColors } from '../../lib/tokens'

type Tab = 'rating' | 'suggestion' | 'complaint'

const TABS: { id: Tab; label: string }[] = [
  { id: 'rating', label: 'Avaliar' },
  { id: 'suggestion', label: 'Sugestao' },
  { id: 'complaint', label: 'Reclamacao' },
]

const FeedbackSheet = forwardRef<BottomSheet>((_props, ref) => {
  const isDark = useColorScheme() === 'dark'
  const [tab, setTab] = useState<Tab>('rating')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const tc = themeColors(isDark)
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

  function reset() {
    setTab('rating')
    setRating(0)
    setMessage('')
  }

  async function handleSubmit() {
    if (tab === 'rating' && rating === 0) {
      Alert.alert('Erro', 'Seleccione uma avaliacao')
      return
    }
    if ((tab === 'suggestion' || tab === 'complaint') && !message.trim()) {
      Alert.alert('Erro', 'Escreva a sua mensagem')
      return
    }

    setSubmitting(true)
    try {
      await apiFetch('/api/v1/feedback/', {
        method: 'POST',
        body: JSON.stringify({
          type: tab,
          rating: tab === 'rating' ? rating : undefined,
          message: message.trim() || undefined,
        }),
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const msgs: Record<Tab, string> = {
        rating: 'Avaliacao enviada. Obrigado!',
        suggestion: 'Sugestao recebida. Obrigado!',
        complaint: 'Reclamacao registada. Vamos analisar.',
      }
      Alert.alert('Sucesso', msgs[tab])
      reset()
      ;(ref as any)?.current?.close()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['60%']}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: card }}
      handleIndicatorStyle={{ backgroundColor: muted }}
    >
      <BottomSheetScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: text }]}>Feedback</Text>

        {/* Tabs */}
        <View style={[styles.tabs, { borderColor: border }]}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.tab, tab === t.id && { borderBottomColor: accent, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[
                styles.tabText,
                { color: tab === t.id ? text : muted },
              ]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Rating */}
        {tab === 'rating' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: muted }]}>Como avalia a aplicacao?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={n <= rating ? colors.warning : tc.handle}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.textArea, { borderColor: border, color: text }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Comentario (opcional)"
              placeholderTextColor={muted}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Suggestion / Complaint */}
        {(tab === 'suggestion' || tab === 'complaint') && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: muted }]}>
              {tab === 'suggestion' ? 'Descreva a sua sugestao' : 'Descreva o problema'}
            </Text>
            <TextInput
              style={[styles.textArea, { borderColor: border, color: text, minHeight: 100 }]}
              value={message}
              onChangeText={setMessage}
              placeholder={
                tab === 'suggestion'
                  ? 'Tenho uma ideia para melhorar...'
                  : 'Encontrei um problema em...'
              }
              placeholderTextColor={muted}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        <Pressable
          style={[styles.submitBtn, { backgroundColor: accent }, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={[styles.submitText, { color: isDark ? colors.light.text : colors.dark.text }]}>
            {submitting ? 'A enviar...' : 'Enviar'}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

FeedbackSheet.displayName = 'FeedbackSheet'
export default FeedbackSheet

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { fontSize: 16, fontWeight: '600' },
})
