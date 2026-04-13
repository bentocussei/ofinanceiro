import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'

import { themeColors } from '../../lib/tokens'

interface Props {
  icon: string
  title: string
  description?: string
}

export default function EmptyState({ icon, title, description }: Props) {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={52} color={tc.textMuted} />
      <Text style={[styles.title, { color: tc.textSecondary }]}>{title}</Text>
      {description && (
        <Text style={[styles.desc, { color: tc.textMuted }]}>{description}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  title: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
