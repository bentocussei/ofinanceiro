import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native'

interface Props {
  message?: string
}

export default function LoadingScreen({ message = 'A carregar...' }: Props) {
  const isDark = useColorScheme() === 'dark'

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
      <Text style={[styles.text, isDark && styles.textDark]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f5f5f5', gap: 12,
  },
  containerDark: { backgroundColor: '#000' },
  text: { fontSize: 15, color: '#999' },
  textDark: { color: '#666' },
})
