import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'

interface Props {
  icon: string
  title: string
  description?: string
}

export default function EmptyState({ icon, title, description }: Props) {
  const isDark = useColorScheme() === 'dark'
  const muted = isDark ? '#666' : '#999'

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={52} color={muted} />
      <Text style={[styles.title, { color: isDark ? '#aaa' : '#555' }]}>{title}</Text>
      {description && (
        <Text style={[styles.desc, { color: muted }]}>{description}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  title: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
