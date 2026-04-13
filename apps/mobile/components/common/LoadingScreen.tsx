import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native'

import { colors, themeColors } from '../../lib/tokens'

interface Props {
  message?: string
}

export default function LoadingScreen({ message = 'A carregar...' }: Props) {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ActivityIndicator size="large" color={tc.text} />
      <Text style={[styles.text, isDark && styles.textDark]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.light.bg, gap: 12,
  },
  containerDark: { backgroundColor: colors.dark.bg },
  text: { fontSize: 15, color: colors.light.textMuted },
  textDark: { color: colors.dark.textMuted },
})
