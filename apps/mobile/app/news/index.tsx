import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect } from 'react'
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, themeColors } from '../../lib/tokens'
import { NewsItem, useNewsStore } from '../../stores/news'

export default function NewsScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const { news: articles, rates, isLoading, fetchNews, fetchRates } = useNewsStore()

  useEffect(() => {
    fetchNews()
    fetchRates()
  }, [])

  const onRefresh = useCallback(() => {
    fetchNews()
    fetchRates()
  }, [])

  const openArticle = (article: NewsItem & { url?: string }) => {
    if (article.url) {
      Linking.openURL(article.url)
    }
  }

  const formatRate = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const renderExchangeRates = () => {
    if (!rates?.rates || Object.keys(rates.rates).length === 0) return null

    const rateEntries = Object.entries(rates.rates)

    return (
      <View style={[styles.ratesCard, { backgroundColor: tc.card }]}>
        <View style={styles.ratesHeader}>
          <Ionicons name="swap-horizontal-outline" size={20} color={tc.text} />
          <Text style={[styles.ratesTitle, { color: tc.text }]}>Taxas de cambio</Text>
        </View>
        <View style={styles.ratesTable}>
          <View style={styles.ratesHeaderRow}>
            <Text style={[styles.rateHeaderCell, { color: tc.textMuted }]}>Moeda</Text>
            <Text style={[styles.rateHeaderCell, { color: tc.textMuted }]}>Compra</Text>
            <Text style={[styles.rateHeaderCell, { color: tc.textMuted }]}>Venda</Text>
          </View>
          {rateEntries.map(([currency, rate]) => (
            <View key={currency} style={[styles.rateRow, { borderTopColor: tc.separator }]}>
              <Text style={[styles.rateCell, styles.rateCurrency, { color: tc.text }]}>
                {currency}
              </Text>
              <Text style={[styles.rateCell, { color: tc.text }]}>
                {formatRate(rate.buy)} Kz
              </Text>
              <Text style={[styles.rateCell, { color: tc.text }]}>
                {formatRate(rate.sell)} Kz
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderArticle = ({ item }: { item: NewsItem }) => (
    <Pressable
      style={[styles.articleCard, { backgroundColor: tc.card }]}
      onPress={() => openArticle(item as NewsItem & { url?: string })}
    >
      <View style={styles.articleHeader}>
        <Ionicons name="newspaper-outline" size={18} color={tc.icon} />
        <Text style={[styles.articleSource, { color: tc.textMuted }]}>{item.source}</Text>
        <Text style={[styles.articleDate, { color: tc.textMuted }]}>
          {new Date(item.date).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={[styles.articleTitle, { color: tc.text }]}>{item.title}</Text>
      {item.summary && (
        <Text style={[styles.articleSummary, { color: tc.textSecondary }]} numberOfLines={3}>
          {item.summary}
        </Text>
      )}
    </Pressable>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <Text style={[styles.title, { color: tc.text }]}>Noticias</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticle}
        ListHeaderComponent={renderExchangeRates}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={48} color={tc.handle} />
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>Nenhuma noticia disponivel</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  ratesCard: { borderRadius: 16, padding: 16, marginBottom: 4 },
  ratesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ratesTitle: { fontSize: 16, fontWeight: '600' },
  ratesTable: {},
  ratesHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  rateHeaderCell: { flex: 1, fontSize: 11, fontWeight: '600' },
  rateRow: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 0.5 },
  rateCell: { flex: 1, fontSize: 14, fontFamily: 'monospace' },
  rateCurrency: { fontWeight: '600' },
  articleCard: { borderRadius: 16, padding: 16 },
  articleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  articleSource: { fontSize: 12, fontWeight: '600' },
  articleDate: { fontSize: 12, marginLeft: 'auto' },
  articleTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  articleSummary: { fontSize: 14, lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16 },
})
