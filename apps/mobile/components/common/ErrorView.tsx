import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native'

import { colors, themeColors } from '../../lib/tokens'

interface Props {
  message?: string
  onRetry?: () => void
}

export default function ErrorView({
  message = 'Ocorreu um erro. Verifique a sua ligação.',
  onRetry,
}: Props) {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={48} color={tc.handle} />
      <Text style={[styles.message, isDark && styles.textMuted]}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  message: { fontSize: 15, color: colors.light.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.primaryLight, marginTop: 8,
  },
  retryText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  textMuted: { color: colors.dark.textMuted },
})
