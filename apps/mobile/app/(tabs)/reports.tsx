import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ReportsScreen() {
  const isDark = useColorScheme() === 'dark'

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.textLight]}>Relatórios</Text>
      </View>
      <View style={styles.placeholder}>
        <Ionicons name="bar-chart-outline" size={64} color={isDark ? '#444' : '#ddd'} />
        <Text style={[styles.placeholderText, isDark && styles.textMuted]}>
          Gráficos e análises disponíveis em breve
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholderText: { fontSize: 15, color: '#999', textAlign: 'center' },
  textLight: { color: '#fff' },
  textMuted: { color: '#666' },
})
