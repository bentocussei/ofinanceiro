import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native'

interface Props {
  message?: string
  onRetry?: () => void
}

export default function ErrorView({
  message = 'Ocorreu um erro. Verifique a sua ligação.',
  onRetry,
}: Props) {
  const isDark = useColorScheme() === 'dark'

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={48} color={isDark ? '#666' : '#ccc'} />
      <Text style={[styles.message, isDark && styles.textMuted]}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh" size={18} color="#3b82f6" />
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  message: { fontSize: 15, color: '#999', textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#eff6ff', marginTop: 8,
  },
  retryText: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  textMuted: { color: '#666' },
})
