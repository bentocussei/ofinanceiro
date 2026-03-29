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

import { ExchangeRate, NewsArticle, useNewsStore } from '../../stores/news'

export default function NewsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { articles, exchangeRates, isLoading, fetchNews, fetchExchangeRates } = useNewsStore()

  useEffect(() => {
    fetchNews()
    fetchExchangeRates()
  }, [])

  const onRefresh = useCallback(() => {
    fetchNews()
    fetchExchangeRates()
  }, [])

  const openArticle = (article: NewsArticle) => {
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
    if (exchangeRates.length === 0) return null

    return (
      <View style={[styles.ratesCard, isDark && styles.cardDark]}>
        <View style={styles.ratesHeader}>
          <Ionicons name="swap-horizontal-outline" size={20} color={isDark ? '#fff' : '#000'} />
          <Text style={[styles.ratesTitle, isDark && styles.textLight]}>Taxas de cambio</Text>
        </View>
        <View style={styles.ratesTable}>
          <View style={styles.ratesHeaderRow}>
            <Text style={[styles.rateHeaderCell, isDark && styles.textMuted]}>Moeda</Text>
            <Text style={[styles.rateHeaderCell, isDark && styles.textMuted]}>Compra</Text>
            <Text style={[styles.rateHeaderCell, isDark && styles.textMuted]}>Venda</Text>
          </View>
          {exchangeRates.map((rate: ExchangeRate) => (
            <View key={rate.currency} style={styles.rateRow}>
              <Text style={[styles.rateCell, styles.rateCurrency, isDark && styles.textLight]}>
                {rate.currency}
              </Text>
              <Text style={[styles.rateCell, isDark && styles.textLight]}>
                {formatRate(rate.buy)} Kz
              </Text>
              <Text style={[styles.rateCell, isDark && styles.textLight]}>
                {formatRate(rate.sell)} Kz
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderArticle = ({ item }: { item: NewsArticle }) => (
    <Pressable
      style={[styles.articleCard, isDark && styles.cardDark]}
      onPress={() => openArticle(item)}
    >
      <View style={styles.articleHeader}>
        <Ionicons name="newspaper-outline" size={18} color={isDark ? '#ccc' : '#666'} />
        <Text style={[styles.articleSource, isDark && styles.textMuted]}>{item.source}</Text>
        <Text style={[styles.articleDate, isDark && styles.textMuted]}>
          {new Date(item.published_at).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={[styles.articleTitle, isDark && styles.textLight]}>{item.title}</Text>
      {item.summary && (
        <Text style={[styles.articleSummary, isDark && styles.textMuted]} numberOfLines={3}>
          {item.summary}
        </Text>
      )}
    </Pressable>
  )

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>Noticias</Text>
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
            <Ionicons name="newspaper-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>Nenhuma noticia disponivel</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  list: { padding: 16, gap: 12 },
  ratesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4 },
  cardDark: { backgroundColor: '#1a1a1a' },
  ratesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ratesTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  ratesTable: {},
  ratesHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  rateHeaderCell: { flex: 1, fontSize: 11, fontWeight: '600', color: '#999' },
  rateRow: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: '#f0f0f0' },
  rateCell: { flex: 1, fontSize: 14, fontFamily: 'monospace', color: '#000' },
  rateCurrency: { fontWeight: '600' },
  articleCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  articleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  articleSource: { fontSize: 12, color: '#999', fontWeight: '600' },
  articleDate: { fontSize: 12, color: '#999', marginLeft: 'auto' },
  articleTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  articleSummary: { fontSize: 14, color: '#666', lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
